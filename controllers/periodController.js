const Period = require("../models/Period");

const { PERIOD_STATUSES } = Period;

function toResponse(period) {
  if (!period) return null;
  return {
    _id: period._id,
    code: period.code,
    name: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
    status: period.status,
    description: period.description,
    maxStudents: period.maxStudents,
    registrationDeadline: period.registrationDeadline,
    createdBy: period.createdBy,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  };
}

exports.getAllPeriods = async (req, res) => {
  try {
    const periods = await Period.find()
      .sort({ startDate: -1, endDate: -1, createdAt: -1 })
      .lean();

    return res.json({
      status: "Success",
      data: periods.map((p) => ({
        ...toResponse(p),
        startDate: p.startDate || p.start_date || null,
        endDate: p.endDate || p.end_date || null,
        status:
          p.status ||
          (p.is_active === false ? "CLOSED" : "OPEN"),
      })),
    });
  } catch (error) {
    console.error(">>> [PeriodController] getAllPeriods error:", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Không lấy được danh sách đợt", error: error.message });
  }
};

exports.createPeriod = async (req, res) => {
  try {
    const { code, name, status } = req.body || {};
    const startDateInput = req.body.startDate || req.body.start_date;
    const endDateInput = req.body.endDate || req.body.end_date;
    const statusInput =
      status !== undefined
        ? status
        : req.body.is_active !== undefined
        ? req.body.is_active
        : undefined;

    if (!code || !name || !startDateInput || !endDateInput) {
      return res.status(400).json({
        status: "Error",
        message: "Vui lòng nhập đầy đủ mã đợt, tên đợt, ngày bắt đầu và ngày kết thúc",
      });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    let normalizedStatus;
    if (typeof statusInput === "boolean") {
      normalizedStatus = statusInput ? "OPEN" : "CLOSED";
    } else if (typeof statusInput === "string") {
      normalizedStatus = String(statusInput).trim().toUpperCase();
    } else {
      normalizedStatus = "OPEN";
    }

    if (!PERIOD_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        status: "Error",
        message: "Trạng thái không hợp lệ (chỉ OPEN hoặc CLOSED)",
      });
    }

    const start = new Date(startDateInput);
    const end = new Date(endDateInput);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        status: "Error",
        message: "Ngày bắt đầu hoặc kết thúc không hợp lệ",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        status: "Error",
        message: "Ngày bắt đầu phải trước ngày kết thúc",
      });
    }

    const existed = await Period.findOne({ code: normalizedCode }).lean();
    if (existed) {
      return res.status(409).json({
        status: "Error",
        message: "Mã đợt đã tồn tại",
      });
    }

    const period = new Period({
      code: normalizedCode,
      name: String(name).trim(),
      startDate: start,
      endDate: end,
      status: normalizedStatus,
    });

    if (req.user && req.user._id) {
      period.createdBy = req.user._id;
    }

    await period.save();

    return res.status(201).json({
      status: "Success",
      message: "Tạo đợt thực tập thành công",
      data: toResponse(period),
    });
  } catch (error) {
    console.error(">>> [PeriodController] createPeriod error:", error);
    return res
      .status(500)
      .json({ status: "Error", message: "Không thể tạo đợt thực tập", error: error.message });
  }
};
