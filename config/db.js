const mongoose = require("mongoose");

// Timeout ngắn để khi MongoDB mất kết nối thì request không treo lâu (tránh kẹt loading phía client)
const SERVER_SELECTION_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 8000;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/intern_system_v2";
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      connectTimeoutMS: CONNECT_TIMEOUT_MS,
    });
    console.log(" MongoDB Connected");
  } catch (error) {
    console.error(" MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
