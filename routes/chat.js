const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const {
  shouldSendAutoReply,
  createAutoReplyMessage,
  SYSTEM_DISPLAY_NAME: systemDisplayName,
} = require("../services/autoReplyService");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/** HR/Mentor chỉ được chat với user cùng công ty hoặc Admin. */
async function canChatWith(myRole, myCompanyId, otherStudentCode) {
  const role = (myRole || "").toLowerCase();
  if (role === "admin") return true;
  if (role !== "company_hr" && role !== "mentor") return true;
  if (!myCompanyId) return false;
  const other = await User.findOne({ student_code: otherStudentCode }).select("company_id role").lean();
  if (!other) return false;
  if (other.role === "admin") return true;
  return other.company_id && String(other.company_id) === String(myCompanyId);
}

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

const chatFileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatUploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/png", "image/gif", "image/webp"
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Chỉ chấp nhận file PDF, Word hoặc ảnh."));
  }
});

// GET /api/chat/conversations
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const myRole = (req.user.role || "").toLowerCase();
    const myCompanyId = req.user.company_id || null;

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
      const user = await User.findOne({ student_code: c._id }).select("student_code full_name email avatar_url role company_id");
      const isHrOrMentor = myRole === "company_hr" || myRole === "mentor";
      if (!user) {
        const fallback = { partner_id: c._id, partner: { vnu_id: c._id, name: "Người dùng" }, last_message: c.lastMessage, unread_count: c.unreadCount, timestamp: c.lastMessage.createdAt, _allow: !isHrOrMentor };
        return fallback;
      }
      const partnerPayload = { vnu_id: user.student_code, student_code: user.student_code, name: user.full_name, email: user.email, avatar_url: user.avatar_url, role: user.role };
      const item = {
        partner_id: c._id,
        partner: partnerPayload,
        last_message: { _id: c.lastMessage._id, message: c.lastMessage.message, type: c.lastMessage.type, sender: c.lastMessage.sender, is_mine: c.lastMessage.sender === my, createdAt: c.lastMessage.createdAt },
        unread_count: c.unreadCount,
        timestamp: c.lastMessage.createdAt,
        _allow: true
      };
      if (isHrOrMentor) {
        const sameCompany = myCompanyId && user.company_id && String(user.company_id) === String(myCompanyId);
        const isAdmin = user.role === "admin";
        if (!sameCompany && !isAdmin) item._allow = false;
      }
      return item;
    }));

    const filtered = (myRole === "company_hr" || myRole === "mentor")
      ? data.filter((d) => d._allow !== false).map(({ _allow, ...rest }) => rest)
      : data.map(({ _allow, ...rest }) => rest);

    // Không hiển thị chính user đăng nhập trong danh sách chat
    const withoutSelf = filtered.filter((d) => {
      const pid = d.partner_id || (d.partner && d.partner.vnu_id);
      return pid != null && String(pid) !== String(my);
    });

    return res.json({ status: "Success", data: withoutSelf });
  } catch (e) {
    console.error(">>> [Chat] conversations:", e.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server" });
  }
});

// GET /api/chat/recent-contacts — Danh sách liên hệ gần đây (lọc nội bộ công ty giống /conversations)
router.get("/recent-contacts", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const myRole = (req.user.role || "").toLowerCase();
    const myCompanyId = req.user.company_id || null;

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
      const user = await User.findOne({ student_code: c._id }).select("student_code full_name email avatar_url role company_id");
      const isHrOrMentor = myRole === "company_hr" || myRole === "mentor";
      if (!user) {
        return { partner_id: c._id, partner: { vnu_id: c._id, name: "Người dùng" }, last_message: c.lastMessage, unread_count: c.unreadCount, timestamp: c.lastMessage.createdAt, _allow: !isHrOrMentor };
      }
      const sameCompany = isHrOrMentor && myCompanyId && user.company_id && String(user.company_id) === String(myCompanyId);
      const isAdmin = user.role === "admin";
      const _allow = !isHrOrMentor || sameCompany || isAdmin;
      return {
        partner_id: c._id,
        partner: { vnu_id: user.student_code, student_code: user.student_code, name: user.full_name, email: user.email, avatar_url: user.avatar_url, role: user.role },
        last_message: c.lastMessage,
        unread_count: c.unreadCount,
        timestamp: c.lastMessage.createdAt,
        _allow
      };
    }));

    const filtered = (myRole === "company_hr" || myRole === "mentor")
      ? data.filter((d) => d._allow !== false) : data;

    // Không hiển thị chính user đăng nhập trong danh sách chat
    const withoutSelf = filtered.filter((d) => {
      const pid = d.partner_id || (d.partner && d.partner.vnu_id);
      return pid != null && String(pid) !== String(my);
    });

    const list = withoutSelf.map((c) => ({
      contact: c.partner ? { vnu_id: c.partner.vnu_id, student_code: c.partner.student_code, name: c.partner.name, email: c.partner.email, avatar_url: c.partner.avatar_url, role: c.partner.role } : { vnu_id: c.partner_id, name: "Người dùng" },
      latest_message: c.last_message || {},
      unread_count: c.unread_count,
      timestamp: c.timestamp
    }));
    return res.json({ status: "Success", data: list });
  } catch (e) {
    console.error(">>> [Chat] recent-contacts:", e.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server" });
  }
});

// GET /api/chat/messages/:student_code
// - Khi other === "ADMIN": trả về tin nhắn giữa my và bất kỳ admin nào (sinh viên thấy tin admin gửi).
// - Khi my là admin (role admin) xem chat với sinh viên (other): cũng lấy tin gửi tới "ADMIN" (vì SV gửi tới ADMIN), tránh "chỉ bên admin bị" mất tin.
router.get("/messages/:student_code", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const myRole = (req.user.role || "").toLowerCase();
    const other = req.params.student_code;

    let messageFilter;
    let adminIds = [];
    if (other === "ADMIN") {
      adminIds = await User.find({ role: "admin" }).distinct("student_code");
      if (adminIds.length === 0) adminIds.push("ADMIN"); // fallback
      messageFilter = {
        $or: [
          { sender: my, receiver: { $in: adminIds } },
          { sender: { $in: adminIds }, receiver: my },
          { sender: my, receiver: "ADMIN" },
          { sender: "ADMIN", receiver: my }
        ]
      };
    } else {
      // Cuộc hội thoại với một user cụ thể (other)
      messageFilter = {
        $or: [
          { sender: my, receiver: other },
          { sender: other, receiver: my }
        ]
      };
      // Nếu người gọi là admin đang xem chat với sinh viên: SV có thể đã gửi tin tới "ADMIN" → cần lấy cả tin (sender: other, receiver: "ADMIN")
      if (myRole === "admin") {
        adminIds = await User.find({ role: "admin" }).distinct("student_code");
        if (adminIds.length === 0) adminIds.push("ADMIN");
        messageFilter.$or.push(
          { sender: other, receiver: "ADMIN" },
          { sender: "ADMIN", receiver: other }
        );
      }
    }

    const messages = await Message.find(messageFilter).sort({ createdAt: 1 });

    const myUser = await User.findOne({ student_code: my }).select("student_code full_name");
    const otherUser = other === "ADMIN"
      ? await User.findOne({ role: "admin" }).select("student_code full_name")
      : await User.findOne({ student_code: other }).select("student_code full_name");

    const formatted = messages.map((msg) => {
      const isMine = msg.sender === my || (myRole === "admin" && (msg.sender === "ADMIN" || (adminIds && adminIds.includes(msg.sender))));
      const recalled = !!msg.deleted;
      const isAutoReply = !!msg.is_auto_reply;
      const fromName = isAutoReply
        ? systemDisplayName
        : (isMine ? (myUser?.full_name || "Tôi") : (otherUser?.full_name || "Người dùng"));
      return {
        _id: msg._id,
        message: recalled ? "Tin nhắn đã được thu hồi" : msg.message,
        content: recalled ? "Tin nhắn đã được thu hồi" : msg.message,
        from: { vnu_id: msg.sender, name: fromName },
        to: { vnu_id: msg.receiver, name: isMine ? (otherUser?.full_name || "Người dùng") : (myUser?.full_name || "Tôi") },
        sender: msg.sender,
        receiver: msg.receiver,
        isSender: isMine,
        type: recalled ? "recalled" : msg.type,
        attachment_url: recalled ? null : msg.attachment_url,
        is_read: msg.is_read,
        deleted: recalled,
        editedAt: msg.editedAt,
        reactions: msg.reactions || [],
        is_auto_reply: isAutoReply,
        createdAt: msg.createdAt,
        createdDate: msg.createdAt,
        updatedAt: msg.updatedAt
      };
    });

    const readFilter = other === "ADMIN"
      ? { sender: { $in: adminIds }, receiver: my, is_read: false }
      : { sender: other, receiver: my, is_read: false };
    const updateResult = await Message.updateMany(readFilter, { $set: { is_read: true, read_at: new Date() } });
    // Gửi thông báo "đã đọc" cho người gửi (để hiện 2 tick)
    if (updateResult.modifiedCount > 0) {
      const io = req.app.get("io");
      if (io) io.to(other === "ADMIN" ? "ADMIN" : other).emit("MessagesRead", { by: my });
    }

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
    const myRole = (req.user.role || "").toLowerCase();
    const myCompanyId = req.user.company_id || null;
    const { to, message: content, type: msgType } = req.body || {};
    if (!to || !content) {
      return res.status(400).json({ status: "Error", message: "Thiếu người nhận hoặc nội dung" });
    }
    if (to === my) {
      return res.status(400).json({ status: "Error", message: "Không thể gửi tin nhắn cho chính mình" });
    }

    const adminIds = await User.find({ role: "admin" }).distinct("student_code");
    let toResolved = to;
    if (to === "ADMIN" && adminIds.length > 0) {
      toResolved = adminIds[0];
    }

    if (myRole === "company_hr" || myRole === "mentor") {
      const allowed = await canChatWith(myRole, myCompanyId, toResolved);
      if (!allowed) {
        return res.status(403).json({ status: "Error", message: "Bạn chỉ được nhắn tin với người dùng trong nội bộ công ty mình hoặc Admin." });
      }
    }

    const newMessage = await Message.create({
      sender: my,
      receiver: toResolved,
      message: String(content).trim(),
      type: msgType || "text"
    });

    const senderUser = await User.findOne({ student_code: my }).select("student_code full_name avatar_url");
    const receiverUser = await User.findOne({ student_code: toResolved }).select("student_code full_name avatar_url");

    const messagePayload = {
      _id: newMessage._id,
      message: newMessage.message,
      content: newMessage.message,
      from: { vnu_id: my, id: my, name: senderUser?.full_name || "Người dùng", avatar_url: senderUser?.avatar_url || null },
      to: { vnu_id: toResolved, id: toResolved, name: receiverUser?.full_name || "Người dùng", avatar_url: receiverUser?.avatar_url || null },
      sender: my,
      receiver: toResolved,
      createdAt: newMessage.createdAt,
      createdDate: newMessage.createdAt,
      type: newMessage.type,
      is_read: false,
      isSender: true,
      selfSend: true
    };

    const io = req.app.get("io");
    const emitToReceiver = to === "ADMIN" ? "ADMIN" : toResolved;
    if (io) {
      io.to(emitToReceiver).emit("NewMessage", { ...messagePayload, isSender: false, selfSend: false });
      io.to(my).emit("NewMessage", { ...messagePayload, isSender: true, selfSend: true });
    }

    // Trả lời tự động (fallback HTTP): sinh viên gửi tới bất kỳ tài khoản ADMIN nào, theo chiến lược trong autoReplyService
    const isStudentToAdmin = myRole === "student" && adminIds.includes(toResolved);
    if (isStudentToAdmin && adminIds.length > 0 && io) {
      try {
        const shouldSend = await shouldSendAutoReply({ studentCode: my, adminIds });
        if (shouldSend) {
          const { message: autoMsg } = await createAutoReplyMessage({
            receiverStudentCode: my,
            senderAdminCode: adminIds[0],
          });
          const autoPayload = {
            _id: autoMsg._id,
            message: autoMsg.message,
            content: autoMsg.message,
            from: { vnu_id: adminIds[0], id: adminIds[0], name: systemDisplayName, avatar_url: null },
            to: { vnu_id: my, id: my, name: senderUser?.full_name || "Người dùng", avatar_url: senderUser?.avatar_url || null },
            sender: adminIds[0],
            receiver: my,
            createdAt: autoMsg.createdAt,
            createdDate: autoMsg.createdAt,
            type: "text",
            is_read: false,
            is_auto_reply: true,
          };
          io.to(my).emit("NewMessage", { ...autoPayload, isSender: false, selfSend: false });
          io.to("ADMIN").emit("NewMessage", { ...autoPayload, isSender: false, selfSend: false });
        }
      } catch (autoErr) {
        console.error(">>> [Chat] send-message auto-reply failed (non-fatal):", autoErr.message);
      }
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

// PUT /api/chat/message/:id — Sửa tin nhắn (chỉ người gửi, chỉ text)
router.put("/message/:id", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const msgId = req.params.id;
    const { message: newContent } = req.body || {};
    if (!newContent || !String(newContent).trim()) return res.status(400).json({ status: "Error", message: "Thiếu nội dung" });
    const msg = await Message.findById(msgId);
    if (!msg) return res.status(404).json({ status: "Error", message: "Không tìm thấy tin nhắn" });
    if (msg.sender !== my) return res.status(403).json({ status: "Error", message: "Chỉ người gửi mới sửa được" });
    if (msg.deleted) return res.status(400).json({ status: "Error", message: "Không thể sửa tin đã thu hồi" });
    const editedAt = new Date();
    await Message.updateOne({ _id: msgId }, { $set: { message: String(newContent).trim(), editedAt } });
    const partnerId = msg.receiver;
    const senderUser = await User.findOne({ student_code: my }).select("student_code full_name");
    const receiverUser = await User.findOne({ student_code: partnerId }).select("student_code full_name");
    const payload = {
      _id: msgId,
      message: String(newContent).trim(),
      sender: my,
      receiver: partnerId,
      from: { vnu_id: my, name: senderUser?.full_name || "Người dùng" },
      to: { vnu_id: partnerId, name: receiverUser?.full_name || "Người dùng" },
      editedAt,
      type: msg.type
    };
    const io = req.app.get("io");
    if (io) {
      io.to(partnerId).emit("MessageUpdated", payload);
      io.to(my).emit("MessageUpdated", payload);
    }
    return res.json({ status: "Success", data: payload });
  } catch (e) {
    console.error(">>> [Chat] put message:", e.message);
    return res.status(500).json({ status: "Error", message: e.message });
  }
});

// DELETE /api/chat/message/:id — Thu hồi tin nhắn (Soft Delete: deleted=true, không xóa bản ghi)
// Real-time: emit MessageDeleted cho cả người gửi và người nhận (Socket.IO)
router.delete("/message/:id", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const msgId = req.params.id;
    const msg = await Message.findById(msgId);
    if (!msg) return res.status(404).json({ status: "Error", message: "Không tìm thấy tin nhắn" });
    if (msg.sender !== my) return res.status(403).json({ status: "Error", message: "Chỉ người gửi mới thu hồi được" });
    await Message.updateOne(
      { _id: msgId },
      { $set: { deleted: true, deletedAt: new Date(), deletedBy: my, message: "Tin nhắn đã bị thu hồi" } }
    );
    const partnerId = msg.receiver;
    const io = req.app.get("io");
    if (io) {
      io.to(partnerId).emit("MessageDeleted", { messageId: msgId, partnerId: my });
      io.to(my).emit("MessageDeleted", { messageId: msgId, partnerId });
    }
    return res.json({ status: "Success", message: "Đã thu hồi tin nhắn" });
  } catch (e) {
    console.error(">>> [Chat] delete message:", e.message);
    return res.status(500).json({ status: "Error", message: e.message });
  }
});

// POST /api/chat/message/:id/reaction — Thêm/bỏ reaction (toggle)
router.post("/message/:id/reaction", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const msgId = req.params.id;
    const { emoji } = req.body || {};
    if (!emoji || !String(emoji).trim()) return res.status(400).json({ status: "Error", message: "Thiếu emoji" });
    const msg = await Message.findById(msgId);
    if (!msg) return res.status(404).json({ status: "Error", message: "Không tìm thấy tin nhắn" });
    const reactions = (msg.reactions || []).filter(r => !(r.emoji === emoji && r.by === my));
    const hadMine = (msg.reactions || []).some(r => r.emoji === emoji && r.by === my);
    if (!hadMine) reactions.push({ emoji: String(emoji).trim(), by: my });
    await Message.updateOne({ _id: msgId }, { $set: { reactions } });
    const partnerId = msg.sender === my ? msg.receiver : msg.sender;
    const io = req.app.get("io");
    if (io) {
      io.to(partnerId).emit("MessageReaction", { messageId: msgId, reactions });
      io.to(my).emit("MessageReaction", { messageId: msgId, reactions });
    }
    return res.json({ status: "Success", data: { messageId: msgId, reactions } });
  } catch (e) {
    console.error(">>> [Chat] reaction:", e.message);
    return res.status(500).json({ status: "Error", message: e.message });
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

// GET /api/chat/users — tìm kiếm khớp một phần (partial), escape ký tự đặc biệt regex. HR/Mentor chỉ thấy user cùng công ty (hoặc Admin).
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const my = req.user.student_code;
    const myRole = (req.user.role || "").toLowerCase();
    const myCompanyId = req.user.company_id || null;
    const search = req.query.search;

    // Luôn loại chính mình
    let query = { student_code: { $ne: my } };

    if (myRole === "company_hr" || myRole === "mentor") {
      // HR/Mentor: chỉ thấy user cùng công ty hoặc Admin (giữ nguyên logic cũ)
      if (myCompanyId) {
        query.$or = [
          { company_id: myCompanyId },
          { role: "admin" },
        ];
      } else {
        query.role = "admin";
      }
    } else if (myRole === "student") {
      // Sinh viên:
      // - Nếu CHƯA được gán công ty: không hiển thị HR/Mentor nào, chỉ thấy Admin + các sinh viên khác.
      // - Nếu ĐÃ có công ty: thấy
      //   + toàn bộ Admin
      //   + sinh viên khác
      //   + HR/Mentor thuộc cùng company_id
      if (!myCompanyId) {
        query.role = { $in: ["student", "admin"] };
      } else {
        query.$or = [
          { role: { $in: ["student", "admin"] } },
          { role: { $in: ["company_hr", "mentor"] }, company_id: myCompanyId },
        ];
      }
    }

    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchCond = {
        $or: [
          { full_name: { $regex: escaped, $options: "i" } },
          { student_code: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } }
        ]
      };
      query = query.$or ? { $and: [query, searchCond] } : { ...query, ...searchCond };
    }

    const users = await User.find(query).select("student_code full_name email avatar_url role").limit(20);

    // Ẩn hoàn toàn tài khoản giảng viên (lecturer) khỏi tính năng chat
    const visibleUsers = users.filter((u) => u.role !== "lecturer");

    const data = visibleUsers.map((u) => ({
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
    const myRole = (req.user.role || "").toLowerCase();
    const myCompanyId = req.user.company_id || null;
    if (!to) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ status: "Error", message: "Thiếu người nhận" });
    }
    if (myRole === "company_hr" || myRole === "mentor") {
      const allowed = await canChatWith(myRole, myCompanyId, to);
      if (!allowed) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ status: "Error", message: "Bạn chỉ được gửi file cho người dùng trong nội bộ công ty mình hoặc Admin." });
      }
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

// POST /api/chat/upload-file — Gửi file (PDF, Word, ảnh) trong chat
router.post("/upload-file", authMiddleware, chatFileUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: "Error", message: "Không có file" });
    const to = req.body.to;
    const from = req.user.student_code;
    const myRole = (req.user.role || "").toLowerCase();
    const myCompanyId = req.user.company_id || null;
    if (!to) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ status: "Error", message: "Thiếu người nhận" });
    }
    if (myRole === "company_hr" || myRole === "mentor") {
      const allowed = await canChatWith(myRole, myCompanyId, to);
      if (!allowed) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ status: "Error", message: "Bạn chỉ được gửi file cho người dùng trong nội bộ công ty mình hoặc Admin." });
      }
    }
    const fileUrl = "/uploads/chat/" + req.file.filename;
    const isImage = (req.file.mimetype || "").startsWith("image/");
    const newMessage = await Message.create({
      sender: from,
      receiver: to,
      message: isImage ? "[Hình ảnh]" : "[File] " + (req.file.originalname || req.file.filename),
      type: isImage ? "image" : "file",
      attachment_url: fileUrl
    });
    const senderUser = await User.findOne({ student_code: from }).select("student_code full_name avatar_url");
    const receiverUser = await User.findOne({ student_code: to }).select("student_code full_name avatar_url");
    const messageData = {
      _id: newMessage._id,
      message: newMessage.message,
      type: newMessage.type,
      attachment_url: fileUrl,
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
    console.error(">>> [Chat] upload-file:", e.message);
    return res.status(500).json({ status: "Error", message: e.message || "Lỗi tải file" });
  }
});

module.exports = router;
