/**
 * Script sửa dữ liệu internship_period sai (vd: chứa tên người "Nguyễn Văn A")
 * Chạy: node scripts/fix-period-data.js           (chỉ xem, không sửa)
 *       node scripts/fix-period-data.js --apply   (thực sự sửa DB)
 */

const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intern_system_v2';

// Cùng logic với routes/admin.js
const periodNamePattern = /^(đợt|kỳ|hè|đông|xuân|202\d|20\d\d)/i;
function isPeriodNameInvalid(val) {
  if (val == null || String(val).trim() === '') return false; // Trống thì bỏ qua
  const s = String(val).trim();
  if (periodNamePattern.test(s)) return false; // Hợp lệ
  if (s.length < 50 && /^[A-ZÀ-Ỹa-zà-ỹ\s]+$/.test(s)) return true; // Giống tên người
  return false;
}

async function fixPeriodData() {
  const isApply = process.argv.includes('--apply');

  try {
    console.log('🔌 Đang kết nối MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB\n');

    const students = await User.find({ role: 'student' })
      .select('student_code full_name internship_period internship_period_id');

    const toFix = students.filter(u => isPeriodNameInvalid(u.internship_period));

    if (toFix.length === 0) {
      console.log('✅ Không có dữ liệu cần sửa. Tất cả internship_period đều hợp lệ hoặc trống.\n');
      return;
    }

    console.log(`📋 Tìm thấy ${toFix.length} sinh viên có internship_period sai:`);
    toFix.forEach(u => {
      console.log(`   - ${u.student_code} (${u.full_name}): "${u.internship_period}"`);
    });
    console.log('');

    if (!isApply) {
      console.log('⚠️  Chạy ở chế độ xem (dry-run). Không thay đổi DB.');
      console.log('   Để thực sự sửa, chạy: node scripts/fix-period-data.js --apply\n');
      return;
    }

    let fixed = 0;
    for (const u of toFix) {
      await User.updateOne(
        { _id: u._id },
        { $set: { internship_period: null, internship_period_id: null } }
      );
      fixed++;
    }

    console.log(`✅ Đã sửa ${fixed} bản ghi. Cột Đợt thực tập giờ hiển thị "---".\n`);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
  }
}

fixPeriodData();
