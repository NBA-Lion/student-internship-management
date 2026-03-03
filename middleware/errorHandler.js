/**
 * Error handler tập trung + mã lỗi chuẩn
 * Route/controller chỉ cần throw AppError hoặc next(err), middleware này trả response thống nhất.
 */

// Mã lỗi chuẩn (client có thể dùng để hiển thị hoặc i18n)
const ErrorCodes = {
  VALIDATION: "ERR_VALIDATION",
  NOT_FOUND: "ERR_NOT_FOUND",
  UNAUTHORIZED: "ERR_UNAUTHORIZED",
  FORBIDDEN: "ERR_FORBIDDEN",
  CONFLICT: "ERR_CONFLICT",
  BAD_REQUEST: "ERR_BAD_REQUEST",
  DB_ERROR: "ERR_DB",
  INTERNAL: "ERR_INTERNAL",
};

/**
 * Lỗi ứng dụng: throw new AppError(message, statusCode, code)
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = ErrorCodes.INTERNAL) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware xử lý lỗi tập trung (đặt cuối app, sau mọi route)
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || ErrorCodes.INTERNAL;
  const message = err.isOperational ? err.message : "Lỗi hệ thống, vui lòng thử lại sau";

  if (statusCode >= 500) {
    console.error(">>> [ErrorHandler]", code, err.message, err.stack);
  }

  res.status(statusCode).json({
    status: "Error",
    message,
    code,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack, raw: err.message }),
  });
}

/**
 * Bọc async route handler để lỗi tự động chuyển vào next(err)
 * Dùng: router.get("/", asyncHandler(controller.getSomething));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ErrorCodes,
  errorHandler,
  asyncHandler,
};
