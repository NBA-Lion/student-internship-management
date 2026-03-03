/**
 * Validation cho API đợt thực tập (express-validator)
 */
const { body, param, validationResult } = require("express-validator");
const { AppError, ErrorCodes } = require("../middleware/errorHandler");
const Period = require("../models/Period");

const PERIOD_STATUSES = Period.PERIOD_STATUSES || ["OPEN", "CLOSED"];

const createPeriodRules = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Mã đợt là bắt buộc")
    .isLength({ max: 50 })
    .withMessage("Mã đợt tối đa 50 ký tự"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Tên đợt là bắt buộc")
    .isLength({ max: 200 })
    .withMessage("Tên đợt tối đa 200 ký tự"),
  body("startDate")
    .optional({ values: "null", nullable: true })
    .custom((v, { req }) => {
      const raw = v ?? req.body?.start_date;
      if (raw === undefined || raw === "") return Promise.reject(new Error("Ngày bắt đầu là bắt buộc"));
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return Promise.reject(new Error("Ngày bắt đầu không hợp lệ"));
      return true;
    }),
  body("endDate")
    .optional({ values: "null", nullable: true })
    .custom((v, { req }) => {
      const raw = v ?? req.body?.end_date;
      if (raw === undefined || raw === "") return Promise.reject(new Error("Ngày kết thúc là bắt buộc"));
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return Promise.reject(new Error("Ngày kết thúc không hợp lệ"));
      return true;
    }),
  body("status")
    .optional()
    .trim()
    .isIn(PERIOD_STATUSES)
    .withMessage(`Trạng thái phải là một trong: ${PERIOD_STATUSES.join(", ")}`),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active phải là true/false"),
];

const periodIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Id đợt không hợp lệ"),
];

/**
 * Middleware: đọc kết quả validation, nếu có lỗi thì trả 400 và dừng
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstMsg = errors.array()[0]?.msg || "Dữ liệu không hợp lệ";
    return next(new AppError(firstMsg, 400, ErrorCodes.VALIDATION));
  }
  next();
}

module.exports = {
  createPeriodRules,
  periodIdParam,
  validate,
};
