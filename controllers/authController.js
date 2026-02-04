/**
 * Auth controller: forgot password + reset password.
 */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendMail } = require("../services/emailService");

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

module.exports = { forgotPassword, resetPassword };
