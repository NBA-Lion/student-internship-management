/**
 * Script để seed dữ liệu mẫu vào database
 * Chạy: node scripts/seed.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const InternshipPeriod = require('../models/InternshipPeriod');
const Company = require('../models/Company');

const MONGO_URI = 'mongodb://127.0.0.1:27017/intern_system_v2';

// Dữ liệu mẫu
const sampleUsers = [
  {
    student_code: 'ADMIN',
    full_name: 'Trưởng Phòng Đào Tạo',
    email: 'admin@intern.local',
    password: '123',
    role: 'admin'
  },
  {
    student_code: 'SV001',
    full_name: 'Nguyễn Văn An',
    email: 'sv001@intern.local',
    password: '123',
    role: 'student',
    university: 'Đại học Bách Khoa',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    class_name: 'KTPM-K65',
    internship_status: 'Chờ duyệt',
    internship_unit: 'FPT Software',
    internship_topic: 'Phát triển ứng dụng Web'
  },
  {
    student_code: 'SV002',
    full_name: 'Trần Thị Bình',
    email: 'sv002@intern.local',
    password: '123',
    role: 'student',
    university: 'Đại học Bách Khoa',
    faculty: 'Công nghệ thông tin',
    major: 'Hệ thống thông tin',
    class_name: 'HTTT-K65',
    internship_status: 'Đang thực tập',
    internship_unit: 'Viettel',
    internship_topic: 'Quản lý dữ liệu',
    mentor_name: 'Nguyễn Văn Mentor',
    start_date: new Date('2024-01-15'),
    end_date: new Date('2024-04-15')
  },
  {
    student_code: 'SV003',
    full_name: 'Lê Văn Cường',
    email: 'sv003@intern.local',
    password: '123',
    role: 'student',
    university: 'Đại học Công nghệ',
    faculty: 'Công nghệ thông tin',
    major: 'An toàn thông tin',
    class_name: 'ATTT-K66',
    internship_status: 'Đã hoàn thành',
    internship_unit: 'VNPT',
    internship_topic: 'Bảo mật hệ thống mạng',
    mentor_name: 'Trần Văn Hướng Dẫn',
    mentor_feedback: 'Sinh viên chăm chỉ, hoàn thành tốt nhiệm vụ',
    report_score: 8.5,
    final_grade: 8.0,
    final_status: 'Đạt',
    start_date: new Date('2023-09-01'),
    end_date: new Date('2023-12-01')
  },
  {
    student_code: 'SV004',
    full_name: 'Phạm Thị Dung',
    email: 'sv004@intern.local',
    password: '123',
    role: 'student',
    university: 'Đại học Khoa học Tự nhiên',
    faculty: 'Toán - Tin',
    major: 'Khoa học máy tính',
    class_name: 'KHMT-K67',
    internship_status: 'Từ chối',
    admin_note: 'Hồ sơ chưa đầy đủ, thiếu CV'
  }
];

const samplePeriods = [
  {
    name: 'Kỳ thực tập 2024-1',
    code: '2024-1',
    start_date: new Date('2024-01-15'),
    end_date: new Date('2024-04-15'),
    is_active: true,
    description: 'Đợt thực tập học kỳ 1 năm 2024',
    registration_deadline: new Date('2024-01-10')
  },
  {
    name: 'Kỳ thực tập Hè 2024',
    code: '2024-HE',
    start_date: new Date('2024-05-15'),
    end_date: new Date('2024-08-15'),
    is_active: false,
    description: 'Đợt thực tập Hè 2024'
  }
];

// Dữ liệu mẫu doanh nghiệp
const sampleCompanies = [
  {
    name: 'FPT Software',
    address: 'Tòa nhà FPT, Duy Tân, Cầu Giấy, Hà Nội',
    email: 'hr@fpt.com.vn',
    field: 'Công nghệ thông tin',
    website: 'https://fpt-software.com',
    phone: '024-7300-7300',
    contact_person: 'Nguyễn Văn HR',
    is_active: true
  },
  {
    name: 'Viettel Solutions',
    address: '1 Trần Hữu Dực, Nam Từ Liêm, Hà Nội',
    email: 'tuyendung@viettel.com.vn',
    field: 'Viễn thông & CNTT',
    website: 'https://viettelsolutions.com.vn',
    phone: '024-6255-6789',
    contact_person: 'Trần Thị Tuyển Dụng',
    is_active: true
  },
  {
    name: 'VNPT Technology',
    address: '57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội',
    email: 'hr@vnpt.vn',
    field: 'Viễn thông',
    website: 'https://vnpt.com.vn',
    phone: '024-3773-9191',
    is_active: true
  },
  {
    name: 'Samsung Vietnam',
    address: 'KCN Yên Phong, Bắc Ninh',
    email: 'recruit@samsung.com',
    field: 'Điện tử - Công nghệ',
    website: 'https://samsung.com/vn',
    is_active: true
  }
];

async function seed() {
  try {
    console.log('🔌 Đang kết nối MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');

    // Kiểm tra xem đã có dữ liệu chưa
    const userCount = await User.countDocuments();
    console.log(`📊 Số users hiện tại: ${userCount}`);

    if (userCount === 0) {
      console.log('📝 Đang tạo dữ liệu mẫu...');
      
      // Tạo users
      for (const userData of sampleUsers) {
        const existing = await User.findOne({ student_code: userData.student_code });
        if (!existing) {
          await User.create(userData);
          console.log(`  ✅ Tạo user: ${userData.student_code} - ${userData.full_name}`);
        } else {
          console.log(`  ⏭️ User đã tồn tại: ${userData.student_code}`);
        }
      }

      // Tạo periods
      for (const periodData of samplePeriods) {
        const existing = await InternshipPeriod.findOne({ code: periodData.code });
        if (!existing) {
          await InternshipPeriod.create(periodData);
          console.log(`  ✅ Tạo đợt thực tập: ${periodData.name}`);
        }
      }

      // Tạo companies
      for (const companyData of sampleCompanies) {
        const existing = await Company.findOne({ name: companyData.name });
        if (!existing) {
          await Company.create(companyData);
          console.log(`  ✅ Tạo doanh nghiệp: ${companyData.name}`);
        }
      }

      console.log('\n🎉 Seed dữ liệu thành công!');
    } else {
      console.log('⏭️ Đã có dữ liệu, bỏ qua seed.');
      
      // Hiển thị danh sách users
      console.log('\n📋 Danh sách users hiện tại:');
      const users = await User.find().select('student_code full_name role internship_status');
      users.forEach(u => {
        console.log(`  - ${u.student_code}: ${u.full_name} (${u.role}) [${u.internship_status || 'N/A'}]`);
      });
    }

    // Hiển thị thông tin đăng nhập
    console.log('\n🔐 THÔNG TIN ĐĂNG NHẬP MẪU:');
    console.log('  Admin:   ADMIN / 123');
    console.log('  Student: SV001 / 123 (Chờ duyệt)');
    console.log('  Student: SV002 / 123 (Đang thực tập)');
    console.log('  Student: SV003 / 123 (Đã hoàn thành)');
    console.log('  Student: SV004 / 123 (Từ chối)');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Đã ngắt kết nối MongoDB');
  }
}

// Chạy seed
seed();
