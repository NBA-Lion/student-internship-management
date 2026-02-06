const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer for chat images
const chatUploadDir = path.join(__dirname, "..", "uploads", "chat");
if (!fs.existsSync(chatUploadDir)) fs.mkdirSync(chatUploadDir, { recursive: true });

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatUploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET /api/chat/conversations
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const agg = await Message.aggregate([
      { $match: { $or: [{ sender: my }, { receiver: my }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$sender", my] }, "$receiver", "$sender"] },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ["$receiver", my] }, { $eq: ["$is_read", false] }] }, 1, 0] } }
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    const data = await Promise.all(agg.map(async (c) => {
      const user = await User.findOne({ student_code: c._id }).select("student_code full_name email avatar_url role");
      return {
        partner_id: c._id,
        partner: user ? { vnu_id: user.student_code, student_code: user.student_code, name: user.full_name, email: user.email, avatar_url: user.avatar_url, role: user.role } : { vnu_id: c._id, name: "Người dùng" },
        last_message: { _id: c.lastMessage._id, message: c.lastMessage.message, type: c.lastMessage.type, sender: c.lastMessage.sender, is_mine: c.lastMessage.sender === my, createdAt: c.lastMessage.createdAt },
        unread_count: c.unreadCount,
        timestamp: c.lastMessage.createdAt
      };
    }));

    return res.json({ status: "Success", data });
  } catch (e) {
    console.error(">>> [Chat] conversations:", e.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server" });
  }
});

// GET /api/chat/messages/:student_code
router.get("/messages/:student_code", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const other = req.params.student_code;
    const messages = await Message.find({
      $or: [
        { sender: my, receiver: other },
        { sender: other, receiver: my }
      ]
    }).sort({ createdAt: 1 });

    const myUser = await User.findOne({ student_code: my }).select("student_code full_name");
    const otherUser = await User.findOne({ student_code: other }).select("student_code full_name");

    const formatted = messages.map((msg) => {
      const isMine = msg.sender === my;
      return {
        _id: msg._id,
        message: msg.message,
        content: msg.message,
        from: { vnu_id: msg.sender, name: isMine ? (myUser?.full_name || "Tôi") : (otherUser?.full_name || "Người dùng") },
        to: { vnu_id: msg.receiver, name: isMine ? (otherUser?.full_name || "Người dùng") : (myUser?.full_name || "Tôi") },
        sender: msg.sender,
        receiver: msg.receiver,
        isSender: isMine,
        type: msg.type,
        attachment_url: msg.attachment_url,
        is_read: msg.is_read,
        createdAt: msg.createdAt,
        createdDate: msg.createdAt,
        updatedAt: msg.updatedAt
      };
    });

    await Message.updateMany(
      { sender: other, receiver: my, is_read: false },
      { $set: { is_read: true, read_at: new Date() } }
    );

    return res.json({ status: "Success", data: formatted });
  } catch (e) {
    console.error(">>> [Chat] messages:", e.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server" });
  }
});

// POST /api/chat/send-message — Fallback gửi tin khi Socket không dùng được (VD: user mới / Vercel)
router.post("/send-message", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const { to, message: content, type: msgType } = req.body || {};
    if (!to || !content) {
      return res.status(400).json({ status: "Error", message: "Thiếu người nhận hoặc nội dung" });
    }
    if (to === my) {
      return res.status(400).json({ status: "Error", message: "Không thể gửi tin nhắn cho chính mình" });
    }

    const newMessage = await Message.create({
      sender: my,
      receiver: to,
      message: String(content).trim(),
      type: msgType || "text"
    });

    const senderUser = await User.findOne({ student_code: my }).select("student_code full_name avatar_url");
    const receiverUser = await User.findOne({ student_code: to }).select("student_code full_name avatar_url");

    const messagePayload = {
      _id: newMessage._id,
      message: newMessage.message,
      content: newMessage.message,
      from: { vnu_id: my, id: my, name: senderUser?.full_name || "Người dùng", avatar_url: senderUser?.avatar_url || null },
      to: { vnu_id: to, id: to, name: receiverUser?.full_name || "Người dùng", avatar_url: receiverUser?.avatar_url || null },
      sender: my,
      receiver: to,
      createdAt: newMessage.createdAt,
      createdDate: newMessage.createdAt,
      type: newMessage.type,
      isSender: true,
      selfSend: true
    };

    const io = req.app.get("io");
    if (io) {
      io.to(to).emit("NewMessage", { ...messagePayload, isSender: false, selfSend: false });
      io.to(my).emit("NewMessage", { ...messagePayload, isSender: true, selfSend: true });
    }

    return res.json({ status: "Success", data: messagePayload });
  } catch (e) {
    console.error(">>> [Chat] send-message:", e.message);
    return res.status(500).json({ status: "Error", message: e.message || "Lỗi gửi tin nhắn" });
  }
});

// PUT /api/chat/read/:partnerId
router.put("/read/:partnerId", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const partnerId = req.params.partnerId;
    await Message.updateMany(
      { sender: partnerId, receiver: my, is_read: false },
      { $set: { is_read: true, read_at: new Date() } }
    );
    const io = req.app.get("io");
    if (io) io.to(partnerId).emit("MessagesRead", { by: my });
    return res.json({ status: "Success" });
  } catch (e) {
    return res.status(500).json({ status: "Error" });
  }
});

// DELETE /api/chat/conversation/:partnerId
router.delete("/conversation/:partnerId", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const partnerId = req.params.partnerId;
    const result = await Message.deleteMany({
      $or: [
        { sender: my, receiver: partnerId },
        { sender: partnerId, receiver: my }
      ]
    });
    const io = req.app.get("io");
    if (io) {
      io.to(partnerId).emit("ConversationDeleted", { by: my });
      io.to(my).emit("ConversationDeleted", { with: partnerId });
    }
    return res.json({ status: "Success", message: "Đã xóa", deletedCount: result.deletedCount });
  } catch (e) {
    console.error(">>> [Chat] delete:", e.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server" });
  }
});

// GET /api/chat/users — tìm kiếm khớp một phần (partial), escape ký tự đặc biệt regex
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const search = req.query.search;
    let query = { student_code: { $ne: my } };
    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { full_name: { $regex: escaped, $options: "i" } },
        { student_code: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } }
      ];
    }
    const users = await User.find(query).select("student_code full_name email avatar_url role").limit(20);
    const data = users.map((u) => ({
      vnu_id: u.student_code,
      student_code: u.student_code,
      name: u.full_name,
      email: u.email,
      avatar_url: u.avatar_url,
      role: u.role
    }));
    return res.json({ status: "Success", data });
  } catch (e) {
    return res.status(500).json({ status: "Error" });
  }
});

// GET /api/chat/unread-count
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user.student_code, is_read: false });
    return res.json({ status: "Success", unreadCount: count });
  } catch (e) {
    return res.status(500).json({ status: "Error" });
  }
});

// POST /api/chat/upload-image
router.post("/upload-image", authMiddleware, chatUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: "Error", message: "Không có file" });
    const to = req.body.to;
    const from = req.user.student_code;
    if (!to) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ status: "Error", message: "Thiếu người nhận" });
    }
    const imageUrl = "/uploads/chat/" + req.file.filename;
    const newMessage = await Message.create({
      sender: from,
      receiver: to,
      message: "[Hình ảnh]",
      type: "image",
      attachment_url: imageUrl
    });
    const senderUser = await User.findOne({ student_code: from }).select("student_code full_name avatar_url");
    const receiverUser = await User.findOne({ student_code: to }).select("student_code full_name avatar_url");
    const messageData = {
      _id: newMessage._id,
      message: newMessage.message,
      type: "image",
      attachment_url: imageUrl,
      from: { vnu_id: from, name: senderUser?.full_name || "Người dùng", avatar_url: senderUser?.avatar_url },
      to: { vnu_id: to, name: receiverUser?.full_name || "Người dùng", avatar_url: receiverUser?.avatar_url },
      sender: from,
      receiver: to,
      createdAt: newMessage.createdAt,
      createdDate: newMessage.createdAt
    };
    const io = req.app.get("io");
    if (io) {
      io.to(to).emit("NewMessage", { ...messageData, isSender: false, selfSend: false });
      io.to(from).emit("NewMessage", { ...messageData, isSender: true, selfSend: true });
    }
    return res.json({ status: "Success", data: messageData });
  } catch (e) {
    console.error(">>> [Chat] upload:", e.message);
    return res.status(500).json({ status: "Error" });
  }
});

module.exports = router;
