const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";

// Generate JWT Token
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      student_code: user.student_code,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Verify JWT Token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Express Middleware for Authentication
async function authMiddleware(req, res, next) {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        status: "Error", 
        message: "Không tìm thấy token xác thực" 
      });
    }

    const token = authHeader.split(" ")[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        status: "Error", 
        message: "Token không hợp lệ hoặc đã hết hạn" 
      });
    }

    // Tìm user trong DB để đảm bảo user vẫn tồn tại
    const user = await User.findOne({ student_code: decoded.student_code });
    
    if (!user) {
      return res.status(401).json({ 
        status: "Error", 
        message: "Người dùng không tồn tại" 
      });
    }

    // Gắn user info vào request
    req.user = {
      id: user._id,
      student_code: user.student_code,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    next();
  } catch (error) {
    console.error(">>> [Auth Middleware] Lỗi:", error.message);
    return res.status(500).json({ 
      status: "Error", 
      message: "Lỗi xác thực", 
      error: error.message 
    });
  }
}

// Socket.IO Authentication Middleware
function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return next(new Error("Invalid or expired token"));
    }

    // Gắn user info vào socket
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error("Authentication error: " + error.message));
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  socketAuthMiddleware,
  JWT_SECRET
};
