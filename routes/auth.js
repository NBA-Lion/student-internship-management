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

function isBcryptHash(str) {
  return typeof str === "string" && str.length === 60 && str.startsWith("$2");
}

router.post("/login", async (req, res) => {
  try {
    const { student_code, email, username, password } = req.body;
    const loginValue = (student_code || email || username || "").toString().trim();
    if (!loginValue || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    // Tìm user: student_code không phân biệt hoa thường (đăng ký lưu .toUpperCase()), email không phân biệt hoa thường
    const user = await User.findOne({
      $or: [
        { student_code: { $regex: new RegExp("^" + loginValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } },
        { email: { $regex: new RegExp("^" + loginValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } }
      ]
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const passwordMatch = isBcryptHash(user.password)
      ? await bcrypt.compare(password, user.password)
      : user.password === password;
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Nếu user bật 2FA (TOTP): trả tempToken, không trả token thật
    if (user.totpEnabled && user.totpSecret) {
      const tempToken = generateTempToken(user._id);
      return res.json({
        requires2FA: true,
        tempToken,
        message: "Nhập mã từ ứng dụng xác thực (Google Authenticator)",
      });
    }

    // Tạo JWT token thật
    const token = generateToken(user);

    // Trả về user (không có password) và token
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
