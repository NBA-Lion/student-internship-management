const express = require("express");
const User = require("../models/User");
const { generateToken } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { student_code, email, username, password } = req.body;
    const loginValue = student_code || email || username;
    if (!loginValue || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await User.findOne({
      $or: [{ student_code: loginValue }, { email: loginValue }]
    });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
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
    const user = await User.create(req.body);
    const token = generateToken(user);
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    return res.status(201).json({ user: userResponse, token });
  } catch (error) {
    return res.status(400).json({ message: "Registration failed", error: error.message });
  }
});

// Simple password recovery (placeholder)
router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "Error", data: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "Error", data: "Email không tồn tại trong hệ thống" });
    }

    // Placeholder: in real system, send email reset link here
    return res.json({ status: "Success", data: "Vui lòng kiểm tra email để đặt lại mật khẩu" });
  } catch (error) {
    return res.status(500).json({ status: "Error", data: "Server error", error: error.message });
  }
});

module.exports = router;
