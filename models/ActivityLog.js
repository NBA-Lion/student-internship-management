const mongoose = require("mongoose");

/**
 * Nhật ký hoạt động - hiển thị tại "Hoạt động gần đây" trên Dashboard
 */
const ActivityLogSchema = new mongoose.Schema(
  {
    // Loại: profile_update | report_submit | evaluation | approval | import | system
    type: { type: String, required: true, trim: true },
    // Tiêu đề ngắn (hiển thị trong feed)
    title: { type: String, required: true, trim: true },
    // Mô tả chi tiết (có thể chứa HTML hoặc plain text)
    description: { type: String, trim: true },
    // Tên người liên quan (sinh viên/admin) để in đậm
    actor_name: { type: String, trim: true },
    // MSSV hoặc identifier nếu là sinh viên
    actor_code: { type: String, trim: true },
    // User thực hiện (admin/người gây ra sự kiện)
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Metadata bổ sung (JSON)
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
