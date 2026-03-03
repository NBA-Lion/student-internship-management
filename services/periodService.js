/**
 * Service layer: nghiệp vụ đợt thực tập
 * Controller gọi service, không gọi Model trực tiếp trong logic phức tạp.
 */
const Period = require("../models/Period");
const { PERIOD_STATUSES } = require("../models/Period");
const { AppError, ErrorCodes } = require("../middleware/errorHandler");

const PERIOD_STATUSES_SET = new Set(PERIOD_STATUSES);

function toResponse(period) {
  if (!period) return null;
  const raw = period && typeof period.toJSON === "function" ? period.toJSON() : period;
  return {
    _id: raw._id,
    code: raw.code,
    name: raw.name,
    startDate: raw.startDate || raw.start_date || null,
    endDate: raw.endDate || raw.end_date || null,
    status: raw.status || (raw.is_active === false ? "CLOSED" : "OPEN"),
    description: raw.description,
    maxStudents: raw.maxStudents || raw.max_students,
    registrationDeadline: raw.registrationDeadline || raw.registration_deadline,
    createdBy: raw.createdBy || raw.created_by,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function getAll(sort = { startDate: -1, endDate: -1, createdAt: -1 }) {
  const periods = await Period.find().sort(sort).lean();
  return periods.map((p) => ({
    ...toResponse(p),
    startDate: p.startDate || p.start_date || null,
    endDate: p.endDate || p.end_date || null,
    status: p.status || (p.is_active === false ? "CLOSED" : "OPEN"),
  }));
}

async function getActive() {
  const list = await Period.find({ status: "OPEN" })
    .sort({ startDate: -1, endDate: -1 })
    .lean();
  return list.map(toResponse);
}

async function getById(id) {
  const period = await Period.findById(id);
  return period ? toResponse(period) : null;
}

async function create(data, createdBy = null) {
  const { code, name, startDate, endDate, status } = data;
  const normalizedCode = String(code).trim().toUpperCase();
  const normalizedStatus = normalizeStatus(status);

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Ngày bắt đầu hoặc kết thúc không hợp lệ");
  }
  if (start >= end) {
    throw new Error("Ngày bắt đầu phải trước ngày kết thúc");
  }

  const existed = await Period.findOne({ code: normalizedCode }).lean();
  if (existed) {
    throw new AppError("Mã đợt đã tồn tại", 409, ErrorCodes.CONFLICT);
  }

  const period = new Period({
    code: normalizedCode,
    name: String(name).trim(),
    startDate: start,
    endDate: end,
    status: normalizedStatus,
    createdBy: createdBy || undefined,
  });
  await period.save();
  return toResponse(period);
}

async function update(id, data) {
  const period = await Period.findById(id);
  if (!period) return null;

  const {
    code,
    name,
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
  } = data || {};

  if (code !== undefined) {
    const normalizedCode = String(code).trim().toUpperCase();
    if (normalizedCode !== period.code) {
      const existed = await Period.findOne({ code: normalizedCode }).lean();
      if (existed) {
        throw new AppError("Mã đợt đã tồn tại", 409, ErrorCodes.CONFLICT);
      }
      period.code = normalizedCode;
    }
  }
  if (name !== undefined) period.name = String(name).trim();

  const startInput = startDate || start_date;
  const endInput = endDate || end_date;
  if (startInput) {
    const start = new Date(startInput);
    if (Number.isNaN(start.getTime())) throw new Error("Ngày bắt đầu không hợp lệ");
    period.startDate = start;
  }
  if (endInput) {
    const end = new Date(endInput);
    if (Number.isNaN(end.getTime())) throw new Error("Ngày kết thúc không hợp lệ");
    period.endDate = end;
  }
  if (period.startDate && period.endDate && period.startDate >= period.endDate) {
    throw new Error("Ngày bắt đầu phải trước ngày kết thúc");
  }
  if (description !== undefined) period.description = description;
  if (maxStudents !== undefined || max_students !== undefined) {
    period.maxStudents = maxStudents !== undefined ? maxStudents : max_students;
  }
  if (registrationDeadline !== undefined || registration_deadline !== undefined) {
    const deadline = registrationDeadline || registration_deadline;
    period.registrationDeadline = deadline ? new Date(deadline) : null;
  }
  if (status !== undefined || is_active !== undefined) {
    const incoming = normalizeStatus(status !== undefined ? status : is_active);
    if (PERIOD_STATUSES_SET.has(incoming)) period.status = incoming;
  }

  await period.save();
  return toResponse(period);
}

async function remove(id) {
  const period = await Period.findById(id);
  if (!period) return false;
  await period.deleteOne();
  return true;
}

async function toggle(id) {
  const period = await Period.findById(id);
  if (!period) return null;
  period.status = period.status === "OPEN" ? "CLOSED" : "OPEN";
  await period.save();
  return toResponse(period);
}

function normalizeStatus(value) {
  if (value === undefined || value === null) return "OPEN";
  if (typeof value === "boolean") return value ? "OPEN" : "CLOSED";
  const s = String(value).trim().toUpperCase();
  return PERIOD_STATUSES_SET.has(s) ? s : "OPEN";
}

module.exports = {
  getAll,
  getActive,
  getById,
  create,
  update,
  remove,
  toggle,
  toResponse,
  PERIOD_STATUSES,
};
