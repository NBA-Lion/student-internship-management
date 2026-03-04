const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

const mentorOnly = (req, res, next) => {
  if (req.user.role !== "mentor") {
    return res.status(403).json({ status: "Error", message: "Chỉ Mentor (người hướng dẫn) mới có quyền truy cập" });
  }
  next();
};

// ============================================
// GET /api/mentor/students - Danh sách sinh viên được HR gán cho mình
// ============================================
router.get("/students", authMiddleware, mentorOnly, async (req, res) => {
  try {
    const mentorId = req.user.id || req.user._id;
    const companyId = req.user.company_id || null;

    const baseQuery = { role: "student", mentor_id: mentorId };
    const query = companyId ? { ...baseQuery, company_id: companyId } : baseQuery;

    const students = await User.find(query)
      .select("-password")
      .sort({ full_name: 1 })
      .lean();

    const data = students.map(s => ({
      _id: s._id,
      student_code: s.student_code,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      university: s.university,
      internship_unit: s.internship_unit,
      internship_topic: s.internship_topic,
      internship_status: s.internship_status,
      internship_period: s.internship_period,
      internship_period_id: s.internship_period_id,
      mentor_name: s.mentor_name,
      mentor_feedback: s.mentor_feedback,
      report_score: s.report_score,
      final_grade: s.final_grade,
      final_status: s.final_status,
      start_date: s.start_date,
      end_date: s.end_date,
    }));

    return res.json({ status: "Success", data });
  } catch (error) {
    console.error(">>> [Mentor Route] Lỗi lấy danh sách SV:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
