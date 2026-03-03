/**
 * Đăng ký toàn bộ Socket.IO handlers (connection, message, typing, disconnect)
 * Server gọi: require("./handlers/socket")(io);
 */
const User = require("../../models/User");
const registerMessageHandler = require("./messageHandler");
const registerTypingHandler = require("./typingHandler");

function registerSocketHandlers(io) {
  const userSocketMap = new Map();

  io.on("connection", async (socket) => {
    const user = socket.user;
    const userId = user.student_code;

    console.log(">>> [Socket] User connected:", userId, "| Socket:", socket.id);

    socket.join(userId);
    const role = (user.role || "").toString().toLowerCase();
    if (role === "admin") {
      socket.join("ADMIN");
    }

    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    const fullUserInfo = await User.findOne({ student_code: userId })
      .select("student_code full_name avatar_url email role")
      .lean();

    socket.userInfo = {
      id: userId,
      student_code: userId,
      name: fullUserInfo?.full_name || user.full_name || "Người dùng",
      avatar_url: fullUserInfo?.avatar_url || null,
      role: fullUserInfo?.role || user.role,
    };

    registerMessageHandler(io, socket, userId);
    registerTypingHandler(io, socket, userId);

    socket.on("disconnect", () => {
      console.log(">>> [Socket] User disconnected:", userId, "| Socket:", socket.id);
      if (userSocketMap.has(userId)) {
        userSocketMap.get(userId).delete(socket.id);
        if (userSocketMap.get(userId).size === 0) {
          userSocketMap.delete(userId);
        }
      }
    });
  });
}

module.exports = registerSocketHandlers;
