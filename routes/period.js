const express = require("express");
const InternshipPeriod = require("../models/InternshipPeriod");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Middleware kiểm tra quyền Admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền truy cập" });
  }
  next();
};

// ============================================
// GET /api/period/all - Lấy tất cả đợt thực tập
// ============================================
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const periods = await InternshipPeriod.find()
      .sort({ start_date: -1 })
      .populate("created_by", "full_name student_code");

    return res.json({
      status: "Success",
      data: periods
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi lấy danh sách:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/period/active - Lấy đợt thực tập đang mở
// ============================================
router.get("/active", async (req, res) => {
  try {
    const activePeriods = await InternshipPeriod.find({ is_active: true })
      .sort({ start_date: -1 });

    return res.json({
      status: "Success",
      data: activePeriods
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi lấy đợt active:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/period/:id - Lấy chi tiết đợt thực tập
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const period = await InternshipPeriod.findById(req.params.id)
      .populate("created_by", "full_name student_code");

    if (!period) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    return res.json({
      status: "Success",
      data: period
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi lấy chi tiết:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// POST /api/period - Tạo đợt thực tập mới (Admin only)
// ============================================
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, code, start_date, end_date, description, max_students, registration_deadline } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ 
        status: "Error", 
        message: "Vui lòng điền đầy đủ thông tin bắt buộc (tên, ngày bắt đầu, ngày kết thúc)" 
      });
    }

    // Kiểm tra ngày hợp lệ
    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ 
        status: "Error", 
        message: "Ngày bắt đầu phải trước ngày kết thúc" 
      });
    }

    const newPeriod = new InternshipPeriod({
      name,
      code,
      start_date,
      end_date,
      description,
      max_students: max_students || 0,
      registration_deadline,
      is_active: false,
      created_by: req.user._id
    });

    await newPeriod.save();

    return res.status(201).json({
      status: "Success",
      message: "Tạo đợt thực tập thành công",
      data: newPeriod
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi tạo mới:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// PUT /api/period/:id - Cập nhật đợt thực tập (Admin only)
// ============================================
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, code, start_date, end_date, description, max_students, registration_deadline, is_active } = req.body;

    const period = await InternshipPeriod.findById(req.params.id);
    if (!period) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    // Cập nhật các field
    if (name) period.name = name;
    if (code) period.code = code;
    if (start_date) period.start_date = start_date;
    if (end_date) period.end_date = end_date;
    if (description !== undefined) period.description = description;
    if (max_students !== undefined) period.max_students = max_students;
    if (registration_deadline !== undefined) period.registration_deadline = registration_deadline;
    if (is_active !== undefined) period.is_active = is_active;

    await period.save();

    return res.json({
      status: "Success",
      message: "Cập nhật thành công",
      data: period
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi cập nhật:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// DELETE /api/period/:id - Xóa đợt thực tập (Admin only)
// ============================================
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const period = await InternshipPeriod.findById(req.params.id);
    if (!period) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    await InternshipPeriod.deleteOne({ _id: req.params.id });

    return res.json({
      status: "Success",
      message: "Xóa đợt thực tập thành công"
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi xóa:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// POST /api/period/:id/toggle - Bật/tắt đợt thực tập (Admin only)
// ============================================
router.post("/:id/toggle", authMiddleware, adminOnly, async (req, res) => {
  try {
    const period = await InternshipPeriod.findById(req.params.id);
    if (!period) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    period.is_active = !period.is_active;
    await period.save();

    return res.json({
      status: "Success",
      message: period.is_active ? "Đã mở đợt thực tập" : "Đã đóng đợt thực tập",
      data: period
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi toggle:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
