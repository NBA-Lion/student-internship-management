const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken, generateTempToken } = require("../middleware/auth");
const { authMiddleware } = require("../middleware/auth");
const {
  forgotPassword,
  resetPassword,
  twofaStatus,
  twofaSetup,
  twofaVerifySetup,
  twofaVerifyLogin,
  twofaDisable,
} = require("../controllers/authController");

const router = express.Router();

const failedAttempts = new Map();
const FAILED_THRESHOLD = 3;

function getClientIp(req) {
  return (req.headers["x-forwarded-for"] && req.headers["x-forwarded-for"].split(",")[0].trim()) || req.socket?.remoteAddress || req.ip || "unknown";
}

function isBcryptHash(str) {
  return typeof str === "string" && str.length === 60 && str.startsWith("$2");
}

// Test secret của Google: dùng khi chưa set RECAPTCHA_SECRET_KEY (chỉ dev/test). Production: set RECAPTCHA_SECRET_KEY.
const RECAPTCHA_TEST_SECRET = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

async function verifyRecaptcha(token, remoteip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY || RECAPTCHA_TEST_SECRET;
  if (!token) return false;
  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteip) params.set("remoteip", remoteip);
    const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const data = await resp.json();
    if (!data.success && (process.env.NODE_ENV !== "production")) {
      console.log("[reCAPTCHA] Google response:", JSON.stringify({ success: data.success, "error-codes": data["error-codes"], hostname: data.hostname }));
    }
    return !!data.success;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.log("[reCAPTCHA] Verify error:", e.message);
    return false;
  }
}

router.post("/login", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const count = failedAttempts.get(ip) || 0;
    const requireCaptcha = count >= FAILED_THRESHOLD;
    const { student_code, email, username, password, recaptchaToken } = req.body;

    if (requireCaptcha) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[reCAPTCHA] Login với captcha bắt buộc. Có token?", !!recaptchaToken, "Độ dài:", recaptchaToken?.length || 0);
      }
      const valid = recaptchaToken && (await verifyRecaptcha(recaptchaToken, ip));
      if (!valid) {
        return res.status(400).json({
          requireCaptcha: true,
          message: "Mã xác minh không đúng hoặc đã hết hạn. Vui lòng tick lại ô \"I'm not a robot\" rồi thử đăng nhập."
        });
      }
    }

    const loginValue = (student_code || email || username || "").toString().trim();
    if (!loginValue || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await User.findOne({
      $or: [
        { student_code: { $regex: new RegExp("^" + loginValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } },
        { email: { $regex: new RegExp("^" + loginValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } }
      ]
    });
    if (!user) {
      failedAttempts.set(ip, count + 1);
      return res.status(401).json({
        message: "Mã đăng nhập/email hoặc mật khẩu không đúng. Nếu bạn đã đổi mã nhân viên (admin), hãy đăng nhập bằng mã mới hoặc email.",
        requireCaptcha: (count + 1) >= FAILED_THRESHOLD
      });
    }
    const passwordMatch = isBcryptHash(user.password)
      ? await bcrypt.compare(password, user.password)
      : user.password === password;
    if (!passwordMatch) {
      failedAttempts.set(ip, count + 1);
      return res.status(401).json({
        message: "Mã đăng nhập/email hoặc mật khẩu không đúng. Nếu bạn đã đổi mã nhân viên, hãy thử đăng nhập bằng email.",
        requireCaptcha: (count + 1) >= FAILED_THRESHOLD
      });
    }

    failedAttempts.delete(ip);

    if (user.totpEnabled && user.totpSecret) {
      const tempToken = generateTempToken(user._id);
      return res.json({
        requires2FA: true,
        tempToken,
        message: "Nhập mã từ ứng dụng xác thực (Google Authenticator)",
      });
    }

    const token = generateToken(user);
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.json({ user: userResponse, token });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    }
    const user = await User.create(body);
    const token = generateToken(user);

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({ user: userResponse, token });
  } catch (error) {
    let message = "Đăng ký thất bại.";
    if (error.code === 11000 && error.keyValue) {
      if (error.keyValue.email) message = "Email này đã được sử dụng.";
      else if (error.keyValue.student_code) message = "Mã số sinh viên này đã được đăng ký.";
      else message = "Thông tin đã trùng với tài khoản khác.";
    } else if (error.message) {
      message = error.message;
    }
    return res.status(400).json({ message, error: error.message });
  }
});

// Forgot password: send reset link via email (Ethereal in dev)
router.post("/forget-password", forgotPassword);
router.post("/forgot-password", forgotPassword); // alias

// Reset password: token + newPassword (bcrypt)
router.post("/reset-password", resetPassword);

// ---------- TOTP 2FA ----------
router.get("/2fa/status", authMiddleware, twofaStatus);
router.post("/2fa/verify-login", twofaVerifyLogin);
router.post("/2fa/setup", authMiddleware, twofaSetup);
router.post("/2fa/verify-setup", authMiddleware, twofaVerifySetup);
router.post("/2fa/disable", authMiddleware, twofaDisable);

module.exports = router;
