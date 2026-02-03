const ActivityLog = require("../models/ActivityLog");

/**
 * Ghi một hoạt động vào nhật ký (dùng từ các route khác).
 * @param {Object} opts - { type, title, description?, actor_name?, actor_code?, user_id?, meta? }
 */
async function logActivity(opts) {
  try {
    await ActivityLog.create({
      type: opts.type || "system",
      title: opts.title || "",
      description: opts.description,
      actor_name: opts.actor_name,
      actor_code: opts.actor_code,
      user_id: opts.user_id,
      meta: opts.meta,
    });
  } catch (err) {
    console.error(">>> [ActivityLog] Lỗi ghi log:", err.message);
  }
}

module.exports = { logActivity };
