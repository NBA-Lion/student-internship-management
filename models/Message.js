const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    // Người gửi (student_code)
    sender: { 
      type: String, 
      required: true,
      index: true 
    },
    
    // Người nhận (student_code)
    receiver: { 
      type: String, 
      required: true,
      index: true 
    },
    
    // Nội dung tin nhắn
    message: { 
      type: String, 
      required: true 
    },
    
    // Loại tin nhắn (text, image, file)
    type: { 
      type: String, 
      enum: ["text", "image", "file"],
      default: "text" 
    },
    
    // URL file đính kèm (nếu có)
    attachment_url: { type: String },
    
    // Đã đọc chưa
    is_read: { 
      type: Boolean, 
      default: false 
    },
    
    // Thời gian đọc
    read_at: { type: Date },

    // Thu hồi tin nhắn (chỉ ẩn nội dung, không xóa bản ghi)
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    // Sửa tin nhắn
    editedAt: { type: Date },

    // Reaction: [{ emoji: String, by: String (student_code) }]
    reactions: { type: [{ emoji: String, by: String }], default: [] }
  },
  { 
    timestamps: true // createdAt, updatedAt
  }
);

// Index để query nhanh conversation giữa 2 người
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
