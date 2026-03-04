const mongoose = require("mongoose");

// Timeout ngắn để khi MongoDB mất kết nối thì request không treo lâu (tránh kẹt loading phía client)
const SERVER_SELECTION_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 8000;

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/intern_system_v2";

function connectDB() {
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
  });
}

// Tự kết nối lại khi mất kết nối (tránh trang "sập" khi MongoDB tạm dừng hoặc mạng giật)
mongoose.connection.on("disconnected", () => {
  console.warn(">>> [MongoDB] Mất kết nối. Đang thử kết nối lại...");
  connectDB().catch((err) => console.error(">>> [MongoDB] Kết nối lại thất bại:", err.message));
});

mongoose.connection.on("reconnected", () => {
  console.log(">>> [MongoDB] Đã kết nối lại thành công.");
});

const connectDBWithExit = async () => {
  try {
    await connectDB();
    console.log(" MongoDB Connected");
  } catch (error) {
    console.error(" MongoDB Connection Error:", error.message);
    console.error(" Lưu ý: Khởi động MongoDB trước (vd: chạy 'mongod' hoặc bật MongoDB Service trên Windows).");
    process.exit(1);
  }
};

module.exports = connectDBWithExit;
