const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const User = require("./models/User");
const Message = require("./models/Message");
const { authMiddleware, socketAuthMiddleware } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const periodRoutes = require("./routes/period");
const chatRoutes = require("./routes/chat");
const importRoutes = require("./routes/import");
const activityRoutes = require("./routes/activity");

const app = express();
const server = http.createServer(app);

// Cho phép frontend local + Vercel (deploy). FRONTEND_URL có thể nhiều domain, cách nhau bởi dấu phẩy.
const corsOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "https://student-internship-management.vercel.app",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((u) => u.trim()).filter(Boolean)
    : [])
];

// Cho phép mọi subdomain *.vercel.app (preview + production) - tránh phải thêm từng URL mới
function corsOriginChecker(origin, callback) {
  if (!origin) return callback(null, true);
  const isAllowed = corsOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  callback(null, isAllowed);
}

const io = new Server(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    credentials: true
  }
});

app.set("io", io);

app.use(cors({
  origin: corsOriginChecker,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Route rõ ràng cho file chat (PDF/ảnh): trả file hoặc 404 thân thiện (phải đặt trước static)
app.get("/uploads/chat/:filename", (req, res) => {
  const raw = req.params.filename || "";
  const filename = path.basename(raw);
  if (!filename || filename.includes("..")) {
    return res.status(400).json({ status: "Error", message: "Tên file không hợp lệ" });
  }
  const filePath = path.join(__dirname, "uploads", "chat", filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return res.status(404).json({
      status: "Error",
      message: "File không tìm thấy. Trên hosting miễn phí (Render/Vercel), file tải lên có thể bị xóa khi server khởi động lại."
    });
  }
  res.sendFile(filePath, { headers: { "Content-Disposition": "inline; filename=\"" + filename + "\"" } }, (err) => {
    if (err) res.status(500).json({ status: "Error", message: "Lỗi gửi file" });
  });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/periods", periodRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/import", importRoutes);
app.use("/api/activities", activityRoutes);

// Legacy profile
app.get("/api/profile/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ student_code: req.params.id }).select("-password");
    if (!user) return res.status(404).json({ status: "Error", message: "Không tìm thấy người dùng" });
    return res.json({
      vnu_id: user.student_code,
      student_code: user.student_code,
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    });
  } catch (e) {
    return res.status(500).json({ status: "Error", message: e.message });
  }
});

// Socket.IO
io.use(socketAuthMiddleware);

// ============================================
// SOCKET USER MAPPING (for private rooms)
// ============================================
const userSocketMap = new Map(); // Map userId -> Set of socketIds

io.on("connection", async (socket) => {
  const user = socket.user;
  const userId = user.student_code;
  
  console.log(">>> [Socket] User connected:", userId, "| Socket:", socket.id);

  // ============================================
  // TASK 1: JOIN PRIVATE ROOM BY USER ID
  // Each user joins a room named after their userId
  // ============================================
  socket.join(userId);

  // Sinh viên gửi tin tới "ADMIN" → bất kỳ user role admin nào cũng nhận được (kể cả student_code khác 'ADMIN')
  const role = (user.role || "").toString().toLowerCase();
  if (role === "admin") {
    socket.join("ADMIN");
  }

  // Track socket mapping
  if (!userSocketMap.has(userId)) {
    userSocketMap.set(userId, new Set());
  }
  userSocketMap.get(userId).add(socket.id);

  // Fetch full user info from DB for accurate data
  const fullUserInfo = await User.findOne({ student_code: userId })
    .select("student_code full_name avatar_url email role");

  // Store user info in socket for later use
  socket.userInfo = {
    id: userId,
    student_code: userId,
    name: fullUserInfo?.full_name || user.full_name || "Người dùng",
    avatar_url: fullUserInfo?.avatar_url || null,
    role: fullUserInfo?.role || user.role
  };

  // Notify ONLY users who have chatted with this user (not broadcast to everyone)
  // For now, we skip broadcasting online status to reduce noise

  // ============================================
  // TASK 2: HANDLE SEND MESSAGE (PRIVATE 1-on-1)
  // Trình tự CHUẨN: Nhận data → Lưu DB → Chỉ khi lưu thành công mới emit (reload vẫn thấy tin)
  // Schema Message: sender, receiver, message (không dùng senderId/receiverId/content)
  // ============================================
  socket.on("NewMessage", async (data) => {
    try {
      // ---------- Bước 1: Nhận data từ client ----------
      const { to, message: content, type: msgType } = data || {};
      const from = userId; // LUÔN lấy từ auth, không tin client

      if (!to || content == null || String(content).trim() === "") {
        socket.emit("MessageError", { message: "Thiếu người nhận hoặc nội dung" });
        return;
      }
      if (to === from) {
        socket.emit("MessageError", { message: "Không thể gửi tin nhắn cho chính mình" });
        return;
      }

      const messageContent = String(content).trim();

      // ---------- Bước 2: Lưu vào MongoDB (Model Message: sender, receiver, message) ----------
      let savedMessage = null;
      try {
        savedMessage = await Message.create({
          sender: from,
          receiver: to,
          message: messageContent,
          type: msgType === "image" || msgType === "file" ? msgType : "text"
        });
      } catch (dbErr) {
        console.error(">>> [Socket] Message.create failed:", dbErr.message);
        socket.emit("MessageError", { message: "Lỗi lưu tin nhắn: " + dbErr.message });
        return;
      }

      // Chỉ khi có bản ghi đã lưu (có _id) mới emit
      if (!savedMessage || !savedMessage._id) {
        console.error(">>> [Socket] Message.create did not return saved document");
        socket.emit("MessageError", { message: "Lỗi lưu tin nhắn" });
        return;
      }

      // ---------- Bước 3: Chỉ sau khi lưu thành công mới emit cho client ----------
      const senderUser = await User.findOne({ student_code: from })
        .select("student_code full_name avatar_url");
      const receiverUser = await User.findOne({ student_code: to })
        .select("student_code full_name avatar_url");

      const previousCount = await Message.countDocuments({
        $or: [
          { sender: from, receiver: to },
          { sender: to, receiver: from }
        ],
        _id: { $ne: savedMessage._id }
      });
      const isNewContact = previousCount === 0;

      const messagePayload = {
        _id: savedMessage._id,
        message: savedMessage.message,
        content: savedMessage.message,
        from: {
          vnu_id: from,
          id: from,
          name: senderUser?.full_name || "Người dùng",
          avatar_url: senderUser?.avatar_url || null
        },
        to: {
          vnu_id: to,
          id: to,
          name: receiverUser?.full_name || "Người dùng",
          avatar_url: receiverUser?.avatar_url || null
        },
        sender: from,
        receiver: to,
        createdAt: savedMessage.createdAt,
        createdDate: savedMessage.createdAt,
        timestamp: savedMessage.createdAt,
        type: savedMessage.type,
        is_read: false,
        newContact: isNewContact
      };

      io.to(to).emit("NewMessage", { ...messagePayload, isSender: false, selfSend: false });
      socket.emit("NewMessage", { ...messagePayload, isSender: true, selfSend: true });

      console.log(`>>> [Socket] Message saved & emitted: ${from} -> ${to} | _id: ${savedMessage._id}`);
    } catch (e) {
      // ---------- Bước 4: Bắt lỗi và log ----------
      console.error(">>> [Socket] Error in NewMessage handler:", e.message);
      socket.emit("MessageError", { message: "Lỗi gửi tin nhắn: " + e.message });
    }
  });

  // ============================================
  // TYPING INDICATORS (PRIVATE)
  // ============================================
  socket.on("Typing", (data) => {
    if (data.to) {
      // Send typing indicator ONLY to the recipient
      io.to(data.to).emit("UserTyping", {
        from: userId,
        name: socket.userInfo.name
      });
    }
  });

  socket.on("StopTyping", (data) => {
    if (data.to) {
      io.to(data.to).emit("UserStopTyping", { from: userId });
    }
  });

  // ============================================
  // THU HỒI TIN NHẮN (delete_message → message_deleted)
  // Chỉ người gửi được thu hồi; soft delete DB; emit cho cả hai bên
  // ============================================
  socket.on("delete_message", async (messageId) => {
    try {
      if (!messageId) {
        socket.emit("message_deleted_error", { message: "Thiếu messageId" });
        return;
      }
      const msg = await Message.findById(messageId);
      if (!msg) {
        socket.emit("message_deleted_error", { message: "Không tìm thấy tin nhắn" });
        return;
      }
      if (msg.sender !== userId) {
        socket.emit("message_deleted_error", { message: "Chỉ người gửi mới được thu hồi" });
        return;
      }
      const deletedPayload = {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        message: "Tin nhắn đã bị thu hồi"
      };
      await Message.updateOne(
        { _id: messageId },
        { $set: deletedPayload }
      );
      const idStr = String(msg._id);
      const senderId = msg.sender;
      const receiverId = msg.receiver;
      io.to(senderId).emit("message_deleted", idStr);
      io.to(receiverId).emit("message_deleted", idStr);
      console.log(">>> [Socket] Message recalled:", idStr, "by", userId);
    } catch (e) {
      console.error(">>> [Socket] delete_message error:", e.message);
      socket.emit("message_deleted_error", { message: e.message || "Lỗi thu hồi tin nhắn" });
    }
  });

  // ============================================
  // MARK MESSAGES AS READ
  // ============================================
  socket.on("MarkAsRead", async (data) => {
    try {
      const otherUserId = data.from;
      const myId = userId;

      if (!otherUserId) return;

      // Update all unread messages from the other user
      const result = await Message.updateMany(
        { sender: otherUserId, receiver: myId, is_read: false },
        { $set: { is_read: true, read_at: new Date() } }
      );

      // Notify the sender that their messages have been read
      if (result.modifiedCount > 0) {
        io.to(otherUserId).emit("MessagesRead", {
          by: myId,
          count: result.modifiedCount
        });
      }
    } catch (e) {
      console.error(">>> [Socket] Error marking as read:", e.message);
    }
  });

  // ============================================
  // DISCONNECT HANDLER
  // ============================================
  socket.on("disconnect", () => {
    console.log(">>> [Socket] User disconnected:", userId, "| Socket:", socket.id);
    
    // Remove socket from mapping
    if (userSocketMap.has(userId)) {
      userSocketMap.get(userId).delete(socket.id);
      if (userSocketMap.get(userId).size === 0) {
        userSocketMap.delete(userId);
        // User is completely offline (no more active sockets)
        // We don't broadcast this to avoid privacy issues
      }
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ status: "Error", message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║  Server: http://localhost:${PORT}                    ║
║  Socket.IO ready                               ║
║  MongoDB connected                             ║
╚════════════════════════════════════════════════╝
      `);
    });
  })
  .catch((err) => {
    console.error("DB connect failed:", err);
    process.exit(1);
  });
