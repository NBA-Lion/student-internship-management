const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

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
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((u) => u.trim()).filter(Boolean)
    : [])
];

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set("io", io);

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  // ============================================
  socket.on("NewMessage", async (data) => {
    try {
      const { to, message: content, type: msgType } = data;
      const from = userId; // ALWAYS use authenticated user, NOT client data

      // Validate input
      if (!to || !content) {
        socket.emit("MessageError", { message: "Thiếu người nhận hoặc nội dung" });
        return;
      }

      // Prevent sending message to self
      if (to === from) {
        socket.emit("MessageError", { message: "Không thể gửi tin nhắn cho chính mình" });
        return;
      }

      // Save message to database
      const newMessage = await Message.create({
        sender: from,
        receiver: to,
        message: content,
        type: msgType || "text"
      });

      // IMPORTANT: Fetch sender info from DB, NOT from client
      // This ensures the sender name is always accurate
      const senderUser = await User.findOne({ student_code: from })
        .select("student_code full_name avatar_url");
      const receiverUser = await User.findOne({ student_code: to })
        .select("student_code full_name avatar_url");

      // Check if this is a new contact (first message between these users)
      const previousCount = await Message.countDocuments({
        $or: [
          { sender: from, receiver: to },
          { sender: to, receiver: from }
        ],
        _id: { $ne: newMessage._id }
      });
      const isNewContact = previousCount === 0;

      // ============================================
      // CONSTRUCT PAYLOAD WITH VERIFIED SENDER INFO
      // ============================================
      const messagePayload = {
        _id: newMessage._id,
        message: newMessage.message,
        content: newMessage.message, // Alias for compatibility
        // CRITICAL: Sender info comes from DATABASE, not client
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
        createdAt: newMessage.createdAt,
        createdDate: newMessage.createdAt,
        timestamp: newMessage.createdAt,
        type: newMessage.type,
        newContact: isNewContact
      };

      // ============================================
      // EMIT TO SPECIFIC USERS ONLY (PRIVATE CHAT)
      // ============================================
      
      // 1. Send to RECEIVER ONLY (using their private room)
      io.to(to).emit("NewMessage", {
        ...messagePayload,
        isSender: false,
        selfSend: false
      });

      // 2. Send confirmation back to SENDER ONLY (their own socket)
      socket.emit("NewMessage", {
        ...messagePayload,
        isSender: true,
        selfSend: true
      });

      console.log(`>>> [Socket] Private Message: ${from} (${senderUser?.full_name}) -> ${to} (${receiverUser?.full_name}) | Content: "${content.substring(0, 30)}..."`);
      console.log(`>>> [Socket] Payload from.name: ${messagePayload.from.name}`);
    } catch (e) {
      console.error(">>> [Socket] Error sending message:", e.message);
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
