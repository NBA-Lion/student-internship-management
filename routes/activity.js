const express = require("express");
const ActivityLog = require("../models/ActivityLog");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/activities/recent
 * Lấy danh sách hoạt động gần đây (cho Dashboard).
 * Query: limit (default 20)
 */
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const list = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      status: "Success",
      data: list,
    });
  } catch (err) {
    console.error(">>> [Activity] GET recent error:", err);
    return res.status(500).json({ status: "Error", message: "Không tải được nhật ký hoạt động" });
  }
});

module.exports = router;
