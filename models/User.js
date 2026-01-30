const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // === THÔNG TIN CƠ BẢN ===
    student_code: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ["admin", "student", "lecturer"], 
      default: "student" 
    },
    phone: { type: String },
    dob: { type: Date },
    gender: { type: String },

    // === THÔNG TIN HỌC VẤN / GIẢNG VIÊN ===
    university: { type: String },
    faculty: { type: String },           // Khoa (cho cả SV và GV)
    department: { type: String },        // Khoa/Viện (dành cho Lecturer)
    major: { type: String },
    class_name: { type: String },        // Lớp sinh hoạt (Student only)

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

    // === PHÂN CÔNG HƯỚNG DẪN ===
    mentor_name: { type: String },            // Tên người hướng dẫn
    mentor_email: { type: String },           // Email người hướng dẫn
    mentor_phone: { type: String },           // SĐT người hướng dẫn

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
    registration_status: { type: String, default: null }  // Alias cho internship_status
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

module.exports = mongoose.model("User", UserSchema);
