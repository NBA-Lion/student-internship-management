const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Company = require("../models/Company");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

const companyHrOnly = (req, res, next) => {
  if (req.user.role !== "company_hr") {
    return res.status(403).json({ status: "Error", message: "Chỉ Quản lý Doanh nghiệp/HR mới có quyền truy cập" });
  }
  next();
};

// ============================================
// GET /api/company/students - Danh sách sinh viên (tiếp nhận từ trường, theo từng doanh nghiệp)
// ============================================
router.get("/students", authMiddleware, companyHrOnly, async (req, res) => {
  try {
    const { status, search, period_id } = req.query;

    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(400).json({
        status: "Error",
        message: "Tài khoản HR chưa được gán doanh nghiệp. Liên hệ Admin để cấu hình company_id."
      });
    }

    let query = { role: "student", company_id: companyId };

    if (status) {
      query.$or = [
        { internship_status: status },
        { registration_status: status }
      ];
    }
    if (search && search.trim()) {
      const escaped = String(search.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchCond = {
        $or: [
          { full_name: { $regex: escaped, $options: "i" } },
          { student_code: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } }
        ]
      };
      query = query.$or ? { $and: [query, searchCond] } : { ...query, ...searchCond };
    }
    if (period_id && mongoose.Types.ObjectId.isValid(period_id)) {
      query.internship_period_id = period_id;
    }

    const [students, company] = await Promise.all([
      User.find(query).select("-password").sort({ createdAt: -1 }).lean(),
      Company.findById(companyId).select("name").lean(),
    ]);

    const data = students.map(s => ({
      _id: s._id,
      student_code: s.student_code,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      internship_unit: s.internship_unit,
      internship_topic: s.internship_topic,
      internship_status: s.internship_status,
      mentor_id: s.mentor_id,
      mentor_name: s.mentor_name,
      mentor_email: s.mentor_email,
      mentor_phone: s.mentor_phone,
      mentor_feedback: s.mentor_feedback,
      report_score: s.report_score,
      final_grade: s.final_grade,
      final_status: s.final_status,
    }));

    const company_name = company ? company.name : null;

    return res.json({ status: "Success", data, company_name });
  } catch (error) {
    console.error(">>> [Company Route] Lỗi lấy danh sách SV:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/company/mentors - Danh sách Mentor (nhân sự công ty)
// ============================================
router.get("/mentors", authMiddleware, companyHrOnly, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ status: "Error", message: "Tài khoản HR chưa được gán doanh nghiệp." });
    }

    const mentors = await User.find({ role: "mentor", company_id: companyId })
      .select("_id student_code full_name email phone employee_code is_active")
      .sort({ full_name: 1 })
      .lean();

    const data = (mentors || []).map(m => ({
      _id: m._id,
      student_code: m.student_code,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      employee_code: m.employee_code,
      is_active: typeof m.is_active === "boolean" ? m.is_active : true,
      label: m.full_name + (m.student_code ? ` (${m.student_code})` : ""),
    }));

    return res.json({ status: "Success", data });
  } catch (error) {
    console.error(">>> [Company Route] Lỗi lấy mentors:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// POST /api/company/mentors - Tạo tài khoản Mentor (thêm nhân sự công ty)
// ============================================
router.post("/mentors", authMiddleware, companyHrOnly, async (req, res) => {
  try {
    const { student_code, full_name, email, password, phone, employee_code } = req.body;

    if (!student_code || !student_code.trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập mã nhân sự (student_code)" });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập họ tên" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập email" });
    }

    const existing = await User.findOne({
      $or: [
        { student_code: String(student_code).trim() },
        { email: String(email).trim().toLowerCase() }
      ]
    });
    if (existing) {
      return res.status(400).json({
        status: "Error",
        message: existing.student_code === String(student_code).trim()
          ? "Mã nhân sự đã tồn tại"
          : "Email đã được sử dụng"
      });
    }

    const hashedPassword = await bcrypt.hash(password || "123456", 10);
    const mentor = await User.create({
      student_code: String(student_code).trim(),
      full_name: String(full_name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role: "mentor",
      company_id: req.user.company_id || null,
      phone: phone ? String(phone).trim() : null,
      employee_code: employee_code ? String(employee_code).trim() : null,
    });

    return res.json({
      status: "Success",
      message: "Đã tạo tài khoản Mentor",
      data: {
        _id: mentor._id,
        student_code: mentor.student_code,
        full_name: mentor.full_name,
        email: mentor.email,
        role: mentor.role,
      }
    });
  } catch (error) {
    console.error(">>> [Company Route] Lỗi tạo Mentor:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// PUT /api/company/students/:id/assign - Gán sinh viên cho Mentor
// ============================================
router.put("/students/:id/assign", authMiddleware, companyHrOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { mentor_id } = req.body;

    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ status: "Error", message: "Tài khoản HR chưa được gán doanh nghiệp." });
    }

    let target = await User.findOne({ student_code: id, role: "student", company_id: companyId });
    if (!target) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        target = await User.findOne({ _id: id, role: "student", company_id: companyId });
      }
    }
    if (!target) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy sinh viên" });
    }

    if (!mentor_id || !mongoose.Types.ObjectId.isValid(mentor_id)) {
      return res.status(400).json({ status: "Error", message: "Vui lòng chọn Mentor hợp lệ" });
    }

    const mentor = await User.findOne({
      _id: mentor_id,
      role: "mentor",
      company_id: companyId,
      is_active: { $ne: false }
    })
      .select("full_name email phone is_active")
      .lean();
    if (!mentor) {
      return res.status(404).json({
        status: "Error",
        message: "Không tìm thấy Mentor phù hợp (có thể đã bị khoá hoặc không thuộc doanh nghiệp của bạn)"
      });
    }

    await User.updateOne(
      { _id: target._id },
      {
        $set: {
          mentor_id: mentor_id,
          mentor_name: mentor.full_name || null,
          mentor_email: mentor.email || null,
          mentor_phone: mentor.phone || null,
        }
      }
    );

    const updated = await User.findById(target._id).select("-password").lean();

    return res.json({
      status: "Success",
      message: `Đã gán sinh viên cho ${mentor.full_name}`,
      data: {
        student_code: updated.student_code,
        full_name: updated.full_name,
        mentor_id: updated.mentor_id,
        mentor_name: updated.mentor_name,
        mentor_email: updated.mentor_email,
        mentor_phone: updated.mentor_phone,
      }
    });
  } catch (error) {
    console.error(">>> [Company Route] Lỗi gán Mentor:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// DELETE /api/company/students/:id - Xóa sinh viên khỏi danh sách công ty (chỉ tài khoản SV, Mentor không bị ảnh hưởng)
// ============================================
router.delete("/students/:id", authMiddleware, companyHrOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(400).json({ status: "Error", message: "Tài khoản HR chưa được gán doanh nghiệp." });
    }

    let student = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      student = await User.findOne({ _id: id, role: "student", company_id: companyId });
    }
    if (!student) {
      student = await User.findOne({ student_code: id, role: "student", company_id: companyId });
    }
    if (!student) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy sinh viên thuộc doanh nghiệp của bạn." });
    }

    await User.deleteOne({ _id: student._id });

    return res.json({
      status: "Success",
      message: "Đã xóa sinh viên khỏi danh sách.",
      data: { student_code: student.student_code, full_name: student.full_name }
    });
  } catch (error) {
    console.error(">>> [Company Route] Lỗi xóa sinh viên:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// PUT /api/company/mentors/:id/toggle-active - Khoá/Mở khoá Mentor
// ============================================
router.put("/mentors/:id/toggle-active", authMiddleware, companyHrOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "Error",
        message: "Tài khoản HR chưa được gán doanh nghiệp."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "Error", message: "Mentor không hợp lệ" });
    }

    const mentor = await User.findOne({ _id: id, role: "mentor", company_id: companyId });
    if (!mentor) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy Mentor thuộc doanh nghiệp của bạn" });
    }

    const nextStatus = mentor.is_active === false ? true : false;
    mentor.is_active = nextStatus;
    await mentor.save();

    return res.json({
      status: "Success",
      message: nextStatus ? "Đã mở khoá tài khoản Mentor" : "Đã khoá tài khoản Mentor",
      data: {
        _id: mentor._id,
        full_name: mentor.full_name,
        email: mentor.email,
        is_active: mentor.is_active
      }
    });
  } catch (error) {
    console.error(">>> [Company Route] Lỗi toggle active Mentor:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
