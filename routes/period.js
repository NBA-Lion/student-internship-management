const express = require("express");
const Period = require("../models/Period");
const { authMiddleware } = require("../middleware/auth");
const {
  getAllPeriods,
  createPeriod,
} = require("../controllers/periodController");

const router = express.Router();

const PERIOD_STATUSES = ["OPEN", "CLOSED"];

// Middleware kiểm tra quyền Admin
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ status: "Error", message: "Chỉ Admin mới có quyền truy cập" });
  }
  next();
};

const normalizePeriodResponse = (period) => {
  if (!period) return null;
  const data =
    typeof period.toJSON === "function" ? period.toJSON() : period;
  return {
    _id: data._id,
    code: data.code,
    name: data.name,
    startDate: data.startDate || data.start_date || null,
    endDate: data.endDate || data.end_date || null,
    status:
      data.status ||
      (data.is_active === false ? "CLOSED" : "OPEN"),
    description: data.description,
    maxStudents: data.maxStudents || data.max_students,
    registrationDeadline:
      data.registrationDeadline || data.registration_deadline,
    createdBy: data.createdBy || data.created_by,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

// RESTful GET /api/periods
router.get("/", authMiddleware, getAllPeriods);

// Backwards compatibility for legacy frontend
router.get("/all", authMiddleware, getAllPeriods);

// GET /api/periods/active - Lấy đợt đang mở
router.get("/active", async (req, res) => {
  try {
    const activePeriods = await Period.find({ status: "OPEN" })
      .sort({ startDate: -1, endDate: -1 })
      .lean();

    return res.json({
      status: "Success",
      data: activePeriods.map(normalizePeriodResponse),
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi lấy đợt active:", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// GET /api/periods/:id - Lấy chi tiết đợt
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const period = await Period.findById(req.params.id);

    if (!period) {
      return res
        .status(404)
        .json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    return res.json({
      status: "Success",
      data: normalizePeriodResponse(period),
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi lấy chi tiết:", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// POST /api/periods - Tạo đợt mới (Admin)
router.post("/", authMiddleware, adminOnly, createPeriod);

// PUT /api/periods/:id - Cập nhật đợt (Admin)
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) {
      return res
        .status(404)
        .json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    const {
      name,
      code,
      startDate,
      start_date,
      endDate,
      end_date,
      description,
      maxStudents,
      max_students,
      registrationDeadline,
      registration_deadline,
      status,
      is_active,
    } = req.body || {};

    if (code) {
      const normalizedCode = String(code).trim().toUpperCase();
      if (normalizedCode !== period.code) {
        const existed = await Period.findOne({ code: normalizedCode }).lean();
        if (existed) {
          return res
            .status(409)
            .json({ status: "Error", message: "Mã đợt đã tồn tại" });
        }
        period.code = normalizedCode;
      }
    }

    if (name !== undefined) {
      period.name = String(name).trim();
    }

    const startInput = startDate || start_date;
    const endInput = endDate || end_date;

    if (startInput) {
      const start = new Date(startInput);
      if (Number.isNaN(start.getTime())) {
        return res
          .status(400)
          .json({ status: "Error", message: "Ngày bắt đầu không hợp lệ" });
      }
      period.startDate = start;
    }

    if (endInput) {
      const end = new Date(endInput);
      if (Number.isNaN(end.getTime())) {
        return res
          .status(400)
          .json({ status: "Error", message: "Ngày kết thúc không hợp lệ" });
      }
      period.endDate = end;
    }

    if (period.startDate && period.endDate && period.startDate >= period.endDate) {
      return res.status(400).json({
        status: "Error",
        message: "Ngày bắt đầu phải trước ngày kết thúc",
      });
    }

    if (description !== undefined) {
      period.description = description;
    }

    if (maxStudents !== undefined || max_students !== undefined) {
      period.maxStudents =
        maxStudents !== undefined ? maxStudents : max_students;
    }

    if (
      registrationDeadline !== undefined ||
      registration_deadline !== undefined
    ) {
      const deadline = registrationDeadline || registration_deadline;
      period.registrationDeadline = deadline ? new Date(deadline) : null;
    }

    if (status !== undefined || is_active !== undefined) {
      let incomingStatus;
      if (typeof is_active === "boolean") {
        incomingStatus = is_active ? "OPEN" : "CLOSED";
      } else if (typeof status === "string") {
        incomingStatus = status.trim().toUpperCase();
      }
      if (incomingStatus && !PERIOD_STATUSES.includes(incomingStatus)) {
        return res.status(400).json({
          status: "Error",
          message: "Trạng thái không hợp lệ (chỉ OPEN hoặc CLOSED)",
        });
      }
      if (incomingStatus) {
        period.status = incomingStatus;
      }
    }

    await period.save();

    return res.json({
      status: "Success",
      message: "Cập nhật thành công",
      data: normalizePeriodResponse(period),
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi cập nhật:", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// DELETE /api/periods/:id - Xóa đợt (Admin)
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) {
      return res
        .status(404)
        .json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    await period.deleteOne();

    return res.json({
      status: "Success",
      message: "Xóa đợt thực tập thành công",
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi xóa:", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// POST /api/periods/:id/toggle - Bật/tắt đợt (Admin)
router.post("/:id/toggle", authMiddleware, adminOnly, async (req, res) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) {
      return res
        .status(404)
        .json({ status: "Error", message: "Không tìm thấy đợt thực tập" });
    }

    period.status = period.status === "OPEN" ? "CLOSED" : "OPEN";
    await period.save();

    return res.json({
      status: "Success",
      message: period.status === "OPEN" ? "Đã mở đợt thực tập" : "Đã đóng đợt thực tập",
      data: normalizePeriodResponse(period),
    });
  } catch (error) {
    console.error(">>> [Period Route] Lỗi toggle:", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
