/**
 * Reset mật khẩu user (Admin hoặc bất kỳ user nào)
 * Dùng khi người test đổi mật khẩu và bạn cần lấy lại quyền truy cập.
 *
 * Cách chạy (PowerShell):
 *   $env:MONGODB_URI="mongodb+srv://..."; node scripts/reset-password.js ADMIN 123
 *
 * Tham số:
 *   - Tham số 1: student_code hoặc email (vd: ADMIN, SV001, admin@intern.local)
 *   - Tham số 2: mật khẩu mới (mặc định: 123)
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/intern_system_v2";
const target = process.argv[2]; // ADMIN, SV001, hoặc email
const newPassword = process.argv[3] || "123";

if (!target) {
  console.error("❌ Thiếu tham số. Cách dùng:");
  console.log("   node scripts/reset-password.js <student_code|email> [mật_khẩu_mới]");
  console.log("");
  console.log("   Ví dụ:");
  console.log("   node scripts/reset-password.js ADMIN 123");
  console.log("   node scripts/reset-password.js SV001");
  console.log("   node scripts/reset-password.js admin@intern.local mypass");
  process.exit(1);
}

async function reset() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Đã kết nối MongoDB\n");

    const user = await User.findOne({
      $or: [
        { student_code: { $regex: new RegExp("^" + target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } },
        { email: { $regex: new RegExp("^" + target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } },
      ],
    });

    if (!user) {
      console.error("❌ Không tìm thấy user:", target);
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    console.log("✅ Đã reset mật khẩu:");
    console.log(`   User: ${user.student_code} (${user.full_name})`);
    console.log(`   Mật khẩu mới: ${newPassword}`);
    console.log("\n   Bạn có thể đăng nhập với mật khẩu trên.");
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

reset();
