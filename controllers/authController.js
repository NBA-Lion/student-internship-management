/**
 * Auth controller: forgot password, reset password, TOTP 2FA.
 */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const TOTP = require("totp.js");
const QRCode = require("qrcode");
const User = require("../models/User");

/** Verify TOTP với time window ±1 (cho phép lệch ~30s) để tránh reject do lệch giờ máy/điện thoại. */
function verifyTOTPWithWindow(secret, codeStr, timeStep = 30) {
  const Hotp = TOTP.HOTP;
  const T = Math.floor(Date.now() / 1000 / timeStep);
  const hotp = new Hotp(secret);
  for (let d = -1; d <= 1; d++) {
    if (hotp.genOTP(T + d) === codeStr) return true;
  }
  return false;
}
const { sendMail } = require("../services/emailService");
const { generateToken, generateTempToken, verifyToken } = require("../middleware/auth");

const APP_NAME = process.env.APP_NAME || "QL Thuc Tap";

const RESET_TOKEN_EXPIRE_MINUTES = 15;
// FRONTEND_BASE_URL hoặc FRONTEND_URL (Render) — cần cho link reset password
const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL?.split(",")[0]?.trim() || "http://localhost:3000";

/**
 * forgotPassword: generate reset token, save to user, send email.
 * Nếu gửi email thất bại (vd: Ethereal không chạy trên Render) → vẫn trả resetLink để user dùng (môi trường demo).
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ status: "Error", message: "Email là bắt buộc" });
    }

    const user = await User.findOne({ email: email.trim() });
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Email không tồn tại trong hệ thống" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpire = new Date(Date.now() + RESET_TOKEN_EXPIRE_MINUTES * 60 * 1000);

    await User.updateOne(
      { _id: user._id },
      { $set: { resetPasswordToken: resetToken, resetPasswordExpire } }
    );

    const resetUrl = `${FRONTEND_BASE}/reset-password/${resetToken}`;
    const subject = "Đặt lại mật khẩu - Hệ thống QL SV Thực tập";
    const text = `Bạn đã yêu cầu đặt lại mật khẩu. Click vào link sau (có hiệu lực ${RESET_TOKEN_EXPIRE_MINUTES} phút):\n${resetUrl}`;
    const html = `
      <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
      <p>Click vào link sau để đặt lại mật khẩu (có hiệu lực ${RESET_TOKEN_EXPIRE_MINUTES} phút):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `;

    let emailSent = false;
    try {
      await sendMail({ to: user.email, subject, text, html });
      emailSent = true;
    } catch (mailErr) {
      console.warn(">>> [AuthController] sendMail failed (Ethereal/ production?):", mailErr.message);
    }

    const payload = {
      status: "Success",
      message: emailSent
        ? "Đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư."
        : "Không gửi được email (môi trường demo). Dùng link bên dưới để đặt lại mật khẩu.",
    };
    if (!emailSent || process.env.NODE_ENV !== "production") {
      payload.resetLink = resetUrl;
    }
    return res.json(payload);
  } catch (error) {
    console.error(">>> [AuthController] forgotPassword error:", error);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
}

/**
 * resetPassword: find user by valid token, hash new password, update and clear token.
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ status: "Error", message: "Token và mật khẩu mới là bắt buộc" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ status: "Error", message: "Mật khẩu mới tối thiểu 6 ký tự" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({
        status: "Error",
        message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng gửi yêu cầu mới.",
      });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 },
      }
    );

    return res.json({
      status: "Success",
      message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
  } catch (error) {
    console.error(">>> [AuthController] resetPassword error:", error);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
}

// ========== TOTP 2FA ==========

/**
 * GET /auth/2fa/status — Trả về trạng thái bật/tắt 2FA của user đang đăng nhập.
 */
async function twofaStatus(req, res) {
  try {
    const user = await User.findById(req.user.id).select("totpEnabled");
    return res.json({ status: "Success", totpEnabled: !!user?.totpEnabled });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: "Lỗi server" });
  }
}

/**
 * POST /auth/2fa/setup — Đã đăng nhập, bật 2FA: tạo secret + QR bằng totp.js, chưa bật cho đến khi verify-setup.
 * Dùng totp.js (https://github.com/wuyanxin/totp.js) tương thích Google Authenticator.
 */
async function twofaSetup(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ status: "Error", message: "Không tìm thấy user" });
    if (user.totpEnabled) {
      return res.status(400).json({ status: "Error", message: "Tài khoản đã bật xác thực 2 bước" });
    }

    const secret = TOTP.randomKey();
    const totp = new TOTP(secret);
    const label = String(user.email || user.student_code || user._id).replace(/:/g, "");
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(APP_NAME + ":" + label)}?secret=${secret}&issuer=${encodeURIComponent(APP_NAME)}`;

    let qrDataUrl = null;
    try {
      qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200, margin: 1 });
    } catch (qrErr) {
      console.warn(">>> [AuthController] QRCode.toDataURL failed:", qrErr?.message);
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { totpSecret: secret } }
    );

    return res.json({
      status: "Success",
      secret,
      otpauthUrl,
      qrDataUrl,
      message: "Quét mã QR bằng Google Authenticator (hoặc app tương tự), sau đó nhập mã 6 số để xác nhận.",
    });
  } catch (error) {
    console.error(">>> [AuthController] 2fa setup error:", error);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
}

/**
 * POST /auth/2fa/verify-setup — Xác nhận mã TOTP lần đầu → bật 2FA.
 */
async function twofaVerifySetup(req, res) {
  try {
    const { code } = req.body;
    if (!code || String(code).trim().length < 6) {
      return res.status(400).json({ status: "Error", message: "Nhập mã 6 số từ ứng dụng" });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.totpSecret) {
      return res.status(400).json({ status: "Error", message: "Chưa tạo mã 2FA. Thử bật lại từ đầu." });
    }

    const codeStr = String(code).trim().replace(/\s/g, "");
    if (!verifyTOTPWithWindow(user.totpSecret, codeStr)) {
      return res.status(400).json({ status: "Error", message: "Mã không đúng hoặc đã hết hạn. Thử mã mới." });
    }

    await User.updateOne({ _id: user._id }, { $set: { totpEnabled: true } });
    return res.json({ status: "Success", message: "Đã bật xác thực 2 bước." });
  } catch (error) {
    console.error(">>> [AuthController] 2fa verify-setup error:", error);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
}

/**
 * POST /auth/2fa/verify-login — Sau khi login trả requires2FA + tempToken, client gửi tempToken + code → trả user + token.
 */
async function twofaVerifyLogin(req, res) {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ status: "Error", message: "Thiếu mã xác thực hoặc phiên đăng nhập." });
    }
    const decoded = verifyToken(tempToken);
    if (!decoded || decoded.purpose !== "2fa") {
      return res.status(401).json({ status: "Error", message: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." });
    }
    const user = await User.findById(decoded.userId);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(401).json({ status: "Error", message: "Tài khoản chưa bật 2FA hoặc phiên không hợp lệ." });
    }

    const codeStr = String(code).trim().replace(/\s/g, "");
    if (!verifyTOTPWithWindow(user.totpSecret, codeStr)) {
      return res.status(401).json({ status: "Error", message: "Mã xác thực không đúng hoặc đã hết hạn." });
    }

    const token = generateToken(user);
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.totpSecret;
    return res.json({ status: "Success", user: userResponse, token });
  } catch (error) {
    console.error(">>> [AuthController] 2fa verify-login error:", error);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
}

/**
 * POST /auth/2fa/disable — Tắt 2FA (cần nhập mã hiện tại để xác nhận).
 */
async function twofaDisable(req, res) {
  try {
    const { code } = req.body;
    if (!code || String(code).trim().length < 6) {
      return res.status(400).json({ status: "Error", message: "Nhập mã 6 số hiện tại để tắt 2FA" });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.json({ status: "Success", message: "Tài khoản chưa bật 2FA." });
    }

    const codeStr = String(code).trim().replace(/\s/g, "");
    if (!verifyTOTPWithWindow(user.totpSecret, codeStr)) {
      return res.status(400).json({ status: "Error", message: "Mã không đúng. Không thể tắt 2FA." });
    }

    await User.updateOne(
      { _id: user._id },
      { $unset: { totpSecret: 1, totpEnabled: 1 } }
    );
    return res.json({ status: "Success", message: "Đã tắt xác thực 2 bước." });
  } catch (error) {
    console.error(">>> [AuthController] 2fa disable error:", error);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
  twofaStatus,
  twofaSetup,
  twofaVerifySetup,
  twofaVerifyLogin,
  twofaDisable,
};
