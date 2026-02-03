/**
 * Seed vài hoạt động mẫu vào ActivityLog để test "Hoạt động gần đây" trên Trang chủ Admin.
 * Chạy: node scripts/seed-activities.js
 */
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const ActivityLog = require("../models/ActivityLog");

const samples = [
  { type: "profile_update", title: "Sinh viên Nguyễn Văn A đã cập nhật thông tin hồ sơ.", actor_name: "Nguyễn Văn A" },
  { type: "report_submit", title: "Sinh viên Trần Thị B vừa nộp Báo cáo tuần 1.", actor_name: "Trần Thị B" },
  { type: "evaluation", title: "Hồ sơ của Lê Văn Cường đã được duyệt.", actor_name: "Lê Văn Cường" },
  { type: "import", title: "Import danh sách đợt thực tập: 3 đợt.", description: "Admin đã import file đợt thực tập." },
  { type: "registration", title: "Sinh viên Phạm Thị Dung đã đăng ký thực tập.", actor_name: "Phạm Thị Dung" },
];

async function run() {
  await connectDB();
  const now = new Date();
  for (let i = 0; i < samples.length; i++) {
    const d = new Date(now.getTime() - (i + 1) * 15 * 60 * 1000); // 15 phút cách nhau
    await ActivityLog.create({
      ...samples[i],
      createdAt: d,
      updatedAt: d,
    });
  }
  console.log("✅ Đã seed", samples.length, "hoạt động mẫu. Vào Trang chủ (admin) để xem.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
