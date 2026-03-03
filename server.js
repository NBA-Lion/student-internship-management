const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const User = require("./models/User");
const Message = require("./models/Message");
const { authMiddleware, socketAuthMiddleware } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");
const registerSocketHandlers = require("./handlers/socket");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const periodRoutes = require("./routes/period");
const companyRoutes = require("./routes/company");
const mentorRoutes = require("./routes/mentor");
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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: corsOriginChecker,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
}));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  message: { status: "Error", message: "Quá nhiều thao tác, thử lại sau 15 phút." }
});
app.use("/api/auth", authLimiter);
app.use("/auth", authLimiter);
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
app.use("/api/company", companyRoutes);
app.use("/api/mentor", mentorRoutes);
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
registerSocketHandlers(io);

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Trong dev: xem danh sách API base đã mount (để debug "route not found")
app.get("/api/routes", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ status: "Error", message: "Route not found" });
  }
  const bases = [
    "GET|POST|PUT|DELETE /api/auth",
    "GET|PUT|... /api/user",
    "GET|PUT|POST|DELETE /api/admin (companies, companies/:id/hrs, companies/:id/toggle-active, ...)",
    "GET|... /api/periods",
    "GET|PUT|POST|DELETE /api/company (students, students/:id, students/:id/assign, mentors, ...)",
    "GET|... /api/mentor",
    "GET|POST|... /api/chat",
    "POST /api/import",
    "GET|... /api/activities",
  ];
  res.json({
    hint: "Sau khi thêm route mới: RESTART server (Ctrl+C rồi npm start) hoặc chạy npm run dev để tự động reload.",
    routes: bases,
  });
});

app.use((req, res) => {
  res.status(404).json({ status: "Error", message: "Route not found" });
});

// Error handler tập trung (bắt mọi err từ asyncHandler hoặc next(err))
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║  Server: http://localhost:${PORT}                    ║
║  Socket.IO ready                               ║
║  MongoDB connected                             ║
║                                                ║
║  Lưu ý: Sau khi thêm route mới (API) mà bị     ║
║  "Route not found" → RESTART server (Ctrl+C     ║
║  rồi chạy lại) hoặc dùng: npm run dev          ║
╚════════════════════════════════════════════════╝
      `);
    });
  })
  .catch((err) => {
    console.error("DB connect failed:", err);
    process.exit(1);
  });
