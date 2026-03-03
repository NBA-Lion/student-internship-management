const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // === THÔNG TIN CƠ BẢN (BẮT BUỘC) ===
    student_code: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // === THÔNG TIN CƠ BẢN (TÙY CHỌN) ===
    role: { 
      type: String, 
      enum: ["admin", "student", "company_hr", "mentor", "lecturer"], 
      default: "student" 
    },
    phone: { type: String, default: null },           // Optional - có thể bổ sung sau
    parent_number: { type: String, default: null },   // SĐT phụ huynh
    address: { type: String, default: null },        // Địa chỉ liên hệ
    dob: { type: Date, default: null },               // Optional - có thể bổ sung sau
    gender: { type: String, default: null },

    // === MÃ NHÂN VIÊN HIỂN THỊ (admin/lecturer) - tách khỏi mã đăng nhập (student_code) ===
    employee_code: { type: String, default: null },   // Chỉ để hiển thị; đăng nhập luôn dùng student_code hoặc email

    // === THÔNG TIN HỌC VẤN / GIẢNG VIÊN ===
    university: { type: String, default: "Trung tâm CNTT" },  // Default cho IT Center
    faculty: { type: String, default: null },         // Optional - Khoa
    department: { type: String, default: null },      // Optional - Khoa/Viện (Lecturer)
    major: { type: String, default: null },           // Optional - Ngành
    class_name: { type: String, default: null },      // Optional - Lớp sinh hoạt

    // === THÔNG TIN DOANH NGHIỆP (multi-tenant) ===
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },

    // === THÔNG TIN THỰC TẬP ===
    internship_unit: { type: String },        // Đơn vị thực tập
    internship_topic: { type: String },       // Đề tài thực tập
    internship_period: { type: String },      // Kỳ thực tập (e.g., "2024-1") - Legacy
    internship_period_id: {                   // Reference đến InternshipPeriod
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipPeriod"
    },
    start_date: { type: Date },               // Ngày bắt đầu
    end_date: { type: Date },                 // Ngày kết thúc

    // === HỒ SƠ ĐĂNG KÝ ===
    cv_url: { type: String },                          // Link CV
    recommendation_letter_url: { type: String },       // Thư giới thiệu
    avatar_url: { type: String },                      // Ảnh đại diện

    // === TRẠNG THÁI HỒ SƠ (Admin duyệt) ===
    internship_status: { 
      type: String, 
      enum: [null, "", "Chờ duyệt", "Đang thực tập", "Đã hoàn thành", "Từ chối"],
      default: null 
    },

    // === PHÂN CÔNG HƯỚNG DẪN (do HR gán, Mentor là user trong hệ thống) ===
    mentor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },  // Tài khoản Mentor (role=mentor)
    mentor_name: { type: String },            // Tên người hướng dẫn (sync từ mentor khi gán)
    mentor_email: { type: String },           // Email người hướng dẫn
    mentor_phone: { type: String },            // SĐT người hướng dẫn

    // === KẾT QUẢ ĐÁNH GIÁ (Composite Grading) ===
    mentor_feedback: { type: String },        // Nhận xét từ doanh nghiệp/mentor
    report_score: { type: Number, min: 0, max: 10 },  // Điểm báo cáo (0-10)
    final_grade: { type: Number, min: 0, max: 10 },   // Điểm tổng kết (0-10)
    final_status: { 
      type: String, 
      enum: [null, "", "Pending", "Đạt", "Không đạt"],
      default: null 
    },

    // === GHI CHÚ QUẢN TRỊ ===
    admin_note: { type: String },             // Ghi chú từ Giáo vụ

    // === LEGACY FIELD (để tương thích) ===
    registration_status: { type: String, default: null },  // Alias cho internship_status

    // === RESET PASSWORD (Forgot Password flow) ===
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },

    // === XÁC THỰC 2 BƯỚC (TOTP - Google Authenticator) ===
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },

    // === TRẠNG THÁI TÀI KHOẢN (đặc biệt dùng cho Mentor/HR) ===
    is_active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Virtual để đồng bộ registration_status với internship_status
UserSchema.pre('save', function(next) {
  if (this.internship_status && !this.registration_status) {
    this.registration_status = this.internship_status;
  }
  if (this.registration_status && !this.internship_status) {
    this.internship_status = this.registration_status;
  }
  next();
});

// Index cho truy vấn lọc nhanh (tránh collection scan, giảm thời gian load khi lọc)
UserSchema.index({ role: 1, company_id: 1 });
UserSchema.index({ role: 1, mentor_id: 1 });
UserSchema.index({ role: 1, internship_status: 1 });
UserSchema.index({ role: 1, company_id: 1, internship_status: 1 });
UserSchema.index({ role: 1, internship_period_id: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", UserSchema);
