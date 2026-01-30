const mongoose = require("mongoose");

/**
 * InternshipPeriod Model
 * Quản lý các đợt/kỳ thực tập trong hệ thống
 */
const InternshipPeriodSchema = new mongoose.Schema(
  {
    // Tên đợt thực tập (VD: "Kỳ thực tập 2024-1", "Đợt thực tập Hè 2024")
    name: { 
      type: String, 
      required: [true, "Tên đợt thực tập là bắt buộc"],
      trim: true
    },

    // Mã đợt thực tập (unique identifier)
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    // Ngày bắt đầu đợt thực tập
    start_date: { 
      type: Date,
      required: [true, "Ngày bắt đầu là bắt buộc"]
    },

    // Ngày kết thúc đợt thực tập
    end_date: { 
      type: Date,
      required: [true, "Ngày kết thúc là bắt buộc"]
    },

    // Trạng thái hoạt động (đang mở đăng ký hay không)
    is_active: { 
      type: Boolean, 
      default: false 
    },

    // Mô tả chi tiết về đợt thực tập
    description: { 
      type: String,
      trim: true
    },

    // Số lượng sinh viên tối đa
    max_students: {
      type: Number,
      default: 0 // 0 = không giới hạn
    },

    // Hạn chót đăng ký
    registration_deadline: {
      type: Date
    },

    // Admin tạo đợt thực tập
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { 
    timestamps: true 
  }
);

// Virtual: Kiểm tra đợt thực tập đang diễn ra
InternshipPeriodSchema.virtual("is_ongoing").get(function() {
  const now = new Date();
  return this.start_date <= now && now <= this.end_date;
});

// Virtual: Kiểm tra còn trong hạn đăng ký
InternshipPeriodSchema.virtual("is_registration_open").get(function() {
  if (!this.is_active) return false;
  if (!this.registration_deadline) return this.is_active;
  return new Date() <= this.registration_deadline;
});

// Index để tìm kiếm nhanh
InternshipPeriodSchema.index({ is_active: 1 });
InternshipPeriodSchema.index({ start_date: 1, end_date: 1 });

module.exports = mongoose.model("InternshipPeriod", InternshipPeriodSchema);
