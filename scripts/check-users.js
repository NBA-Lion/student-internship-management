/**
 * Script kiểm tra tất cả users trong database
 */

const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = 'mongodb://127.0.0.1:27017/intern_system_v2';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB\n');

    const users = await User.find({}).select('student_code full_name email role');
    
    console.log('📋 TẤT CẢ USERS TRONG DATABASE:');
    console.log('========================================');
    
    users.forEach((user, idx) => {
      const roleTag = user.role === 'admin' ? '🔴 ADMIN' : 
                      user.role === 'lecturer' ? '🔵 LECTURER' : '🟢 STUDENT';
      console.log(`${idx + 1}. [${roleTag}] ${user.student_code} - ${user.full_name} (${user.email})`);
    });
    
    console.log('========================================');
    console.log(`Tổng số users: ${users.length}`);
    
    // Thống kê theo role
    const stats = {
      admin: users.filter(u => u.role === 'admin').length,
      lecturer: users.filter(u => u.role === 'lecturer').length,
      student: users.filter(u => u.role === 'student').length
    };
    console.log(`\n📊 Thống kê:`);
    console.log(`   Admin: ${stats.admin}`);
    console.log(`   Lecturer: ${stats.lecturer}`);
    console.log(`   Student: ${stats.student}`);

    // Tìm "Trần Thị B"
    const tranThiB = users.find(u => u.full_name?.includes('Trần Thị B'));
    if (tranThiB) {
      console.log(`\n🔍 Tìm thấy "Trần Thị B":`);
      console.log(`   Code: ${tranThiB.student_code}`);
      console.log(`   Name: ${tranThiB.full_name}`);
      console.log(`   Email: ${tranThiB.email}`);
      console.log(`   Role: ${tranThiB.role}`);
    }

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();
