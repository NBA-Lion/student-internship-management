const mongoose = require("mongoose");

/**
 * Company Model
 * Quản lý danh sách doanh nghiệp tiếp nhận sinh viên thực tập
 */
const CompanySchema = new mongoose.Schema(
  {
    // Tên công ty (bắt buộc, unique)
    name: {
      type: String,
      required: [true, "Tên công ty là bắt buộc"],
      unique: true,
      trim: true
    },

    // Địa chỉ công ty
    address: {
      type: String,
      trim: true
    },

    // Email liên hệ
    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    // Lĩnh vực hoạt động
    field: {
      type: String,
      trim: true
    },

    // Website công ty
    website: {
      type: String,
      trim: true
    },

    // Số điện thoại liên hệ
    phone: {
      type: String,
      trim: true
    },

    // Người liên hệ (HR/Manager)
    contact_person: {
      type: String,
      trim: true
    },

    // Mô tả về công ty
    description: {
      type: String,
      trim: true
    },

    // Trạng thái (đang hợp tác / ngừng hợp tác)
    is_active: {
      type: Boolean,
      default: true
    },

    // Số lượng vị trí thực tập có thể nhận
    available_positions: {
      type: Number,
      default: 0
    },

    // Ghi chú từ Admin
    admin_note: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index để tìm kiếm nhanh
CompanySchema.index({ name: "text", field: "text" });
CompanySchema.index({ is_active: 1 });
CompanySchema.index({ email: 1 });

module.exports = mongoose.model("Company", CompanySchema);
