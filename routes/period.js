const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  getAllPeriods,
  getPeriodById,
  getActivePeriods,
  createPeriod,
  updatePeriod,
  deletePeriod,
  togglePeriod,
} = require("../controllers/periodController");
const {
  createPeriodRules,
  periodIdParam,
  validate,
} = require("../validators/periodValidator");

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ status: "Error", message: "Chỉ Admin mới có quyền truy cập" });
  }
  next();
};

// GET /api/periods
router.get("/", authMiddleware, asyncHandler(getAllPeriods));
// GET /api/periods/all (legacy)
router.get("/all", authMiddleware, asyncHandler(getAllPeriods));
// GET /api/periods/active (phải đặt trước /:id)
router.get("/active", asyncHandler(getActivePeriods));
// GET /api/periods/:id
router.get("/:id", authMiddleware, periodIdParam, validate, asyncHandler(getPeriodById));

// POST /api/periods - Tạo đợt (Admin) + validation
router.post(
  "/",
  authMiddleware,
  adminOnly,
  createPeriodRules,
  validate,
  asyncHandler(createPeriod)
);

// PUT /api/periods/:id
router.put(
  "/:id",
  authMiddleware,
  adminOnly,
  periodIdParam,
  validate,
  asyncHandler(updatePeriod)
);

// DELETE /api/periods/:id
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  periodIdParam,
  validate,
  asyncHandler(deletePeriod)
);

// POST /api/periods/:id/toggle
router.post(
  "/:id/toggle",
  authMiddleware,
  adminOnly,
  periodIdParam,
  validate,
  asyncHandler(togglePeriod)
);

module.exports = router;
