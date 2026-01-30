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

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set("io", io);

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
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

io.on("connection", (socket) => {
  const user = socket.user;
  console.log(">>> [Socket] User connected:", user.student_code);

  socket.join(user.student_code);
  socket.broadcast.emit("UserOnline", { student_code: user.student_code });

  socket.on("NewMessage", async (data) => {
    try {
      const { to, message: content } = data;
      const from = user.student_code;

      if (!to || !content) {
        socket.emit("MessageError", { message: "Thiếu người nhận hoặc nội dung" });
        return;
      }

      const newMessage = await Message.create({
        sender: from,
        receiver: to,
        message: content,
        type: "text"
      });

      const senderUser = await User.findOne({ student_code: from }).select("student_code full_name avatar_url");
      const receiverUser = await User.findOne({ student_code: to }).select("student_code full_name avatar_url");

      const previousCount = await Message.countDocuments({
        $or: [{ sender: from, receiver: to }, { sender: to, receiver: from }],
        _id: { $ne: newMessage._id }
      });
      const newContact = previousCount === 0;

      const messageData = {
        _id: newMessage._id,
        message: newMessage.message,
        from: { vnu_id: from, name: senderUser?.full_name || "Người dùng", avatar_url: senderUser?.avatar_url },
        to: { vnu_id: to, name: receiverUser?.full_name || "Người dùng", avatar_url: receiverUser?.avatar_url },
        sender: from,
        receiver: to,
        createdAt: newMessage.createdAt,
        createdDate: newMessage.createdAt,
        type: newMessage.type,
        newContact
      };

      io.to(to).emit("NewMessage", { ...messageData, isSender: false, selfSend: false });
      socket.emit("NewMessage", { ...messageData, isSender: true, selfSend: true });

      console.log(">>> [Socket] Message:", from, "->", to);
    } catch (e) {
      console.error(">>> [Socket] Error:", e.message);
      socket.emit("MessageError", { message: e.message });
    }
  });

  socket.on("Typing", (data) => {
    if (data.to) io.to(data.to).emit("UserTyping", { from: user.student_code });
  });

  socket.on("StopTyping", (data) => {
    if (data.to) io.to(data.to).emit("UserStopTyping", { from: user.student_code });
  });

  socket.on("MarkAsRead", async (data) => {
    try {
      const otherUser = data.from;
      const myCode = user.student_code;
      await Message.updateMany(
        { sender: otherUser, receiver: myCode, is_read: false },
        { $set: { is_read: true, read_at: new Date() } }
      );
      io.to(otherUser).emit("MessagesRead", { by: myCode });
    } catch (e) {}
  });

  socket.on("disconnect", () => {
    console.log(">>> [Socket] User disconnected:", user.student_code);
    socket.broadcast.emit("UserOffline", { student_code: user.student_code });
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
