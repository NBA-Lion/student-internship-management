const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ============================================
// FILE UPLOAD CONFIG (CV & Recommendation Letter)
// ============================================
const uploadDir = path.join(__dirname, "..", "uploads", "documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file PDF, Word, hoặc ảnh (JPG, PNG)'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// ============================================
// GET /api/user/profile/me - Lấy profile của user đang đăng nhập
// ============================================
router.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    const studentCode = req.user.student_code;
    
    if (!studentCode) {
      return res.status(400).json({ status: "Error", message: "Không xác định được người dùng" });
    }

    const user = await User.findOne({ student_code: studentCode }).select("-password");
    
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy người dùng" });
    }

    // Map dữ liệu để frontend nhận đúng format
    const userData = {
      _id: user._id,
      student_code: user.student_code,
      vnu_id: user.student_code, // Alias cho frontend cũ
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      phone_number: user.phone,
      dob: user.dob,
      date_of_birth: user.dob,
      gender: user.gender,
      university: user.university,
      faculty: user.faculty,
      major: user.major,
      class_name: user.class_name,
      department: user.internship_unit,
      internship_unit: user.internship_unit,
      internship_topic: user.internship_topic,
      internship_period: user.internship_period,
      start_date: user.start_date,
      end_date: user.end_date,
      intern_start_date: user.start_date,
      intern_end_date: user.end_date,
      cv_url: user.cv_url,
      recommendation_letter_url: user.recommendation_letter_url,
      // Status fields (hỗ trợ cả 2 tên)
      internship_status: user.internship_status || user.registration_status,
      registration_status: user.registration_status || user.internship_status,
      // Mentor info
      mentor_name: user.mentor_name,
      mentor_email: user.mentor_email,
      mentor_phone: user.mentor_phone,
      // Result/Grading fields
      mentor_feedback: user.mentor_feedback,
      report_score: user.report_score,
      final_grade: user.final_grade,
      final_status: user.final_status,
      admin_note: user.admin_note,
    };

    return res.json({ status: "Success", data: userData });
  } catch (error) {
    console.error(">>> [User Route] Lỗi lấy profile:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/user/profile/:id - Lấy profile theo student_code (Admin hoặc chính mình)
// ============================================
router.get("/profile/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.student_code;
    const requesterRole = req.user.role;

    // Chỉ admin hoặc chính user đó mới được xem
    if (requesterRole !== "admin" && requesterId !== id) {
      return res.status(403).json({ status: "Error", message: "Không có quyền truy cập" });
    }

    const user = await User.findOne({ student_code: id }).select("-password");
    
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy người dùng" });
    }

    const userData = {
      _id: user._id,
      student_code: user.student_code,
      vnu_id: user.student_code,
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      phone_number: user.phone,
      dob: user.dob,
      date_of_birth: user.dob,
      gender: user.gender,
      university: user.university,
      faculty: user.faculty,
      major: user.major,
      class_name: user.class_name,
      department: user.internship_unit,
      internship_unit: user.internship_unit,
      internship_topic: user.internship_topic,
      internship_period: user.internship_period,
      start_date: user.start_date,
      end_date: user.end_date,
      intern_start_date: user.start_date,
      intern_end_date: user.end_date,
      cv_url: user.cv_url,
      recommendation_letter_url: user.recommendation_letter_url,
      internship_status: user.internship_status || user.registration_status,
      registration_status: user.registration_status || user.internship_status,
      mentor_name: user.mentor_name,
      mentor_email: user.mentor_email,
      mentor_phone: user.mentor_phone,
      mentor_feedback: user.mentor_feedback,
      report_score: user.report_score,
      final_grade: user.final_grade,
      final_status: user.final_status,
      admin_note: user.admin_note,
    };

    return res.json({ status: "Success", data: userData });
  } catch (error) {
    console.error(">>> [User Route] Lỗi lấy profile by ID:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// POST /api/user/profile/:id - Cập nhật profile (PUT cũng được map)
// ============================================
router.post("/profile/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.student_code;
    const requesterRole = req.user.role;

    // Xác định student_code cần update
    const targetId = id === "me" ? requesterId : id;

    // Chỉ admin hoặc chính user đó mới được sửa
    if (requesterRole !== "admin" && requesterId !== targetId) {
      return res.status(403).json({ status: "Error", message: "Không có quyền chỉnh sửa" });
    }

    const user = await User.findOne({ student_code: targetId });
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy người dùng" });
    }

    // Các trường cho phép user tự sửa
    const allowedFieldsForUser = [
      "name", "full_name", "phone_number", "date_of_birth", "gender",
      "university", "faculty", "major", "department",
      "internship_topic", "intern_start_date", "intern_end_date",
      "cv_url", "recommendation_letter_url"
    ];

    // Admin có thể sửa thêm các trường quản lý
    const adminOnlyFields = [
      "role", "registration_status", "mentor_name", "mentor_feedback",
      "final_grade", "admin_note", "status"
    ];

    const updateData = {};
    const body = req.body;

    // Map từ frontend field names sang backend field names
    const fieldMapping = {
      name: "full_name",
      full_name: "full_name",
      phone_number: "phone",
      date_of_birth: "dob",
      department: "internship_unit",
      intern_start_date: "start_date",
      intern_end_date: "end_date",
      // Các field khác giữ nguyên tên
    };

    for (const [frontendField, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;

      // Kiểm tra quyền
      const isAllowedForUser = allowedFieldsForUser.includes(frontendField);
      const isAdminOnly = adminOnlyFields.includes(frontendField);

      if (!isAllowedForUser && !isAdminOnly) continue; // Bỏ qua field không hợp lệ
      if (isAdminOnly && requesterRole !== "admin") continue; // User thường không sửa được field admin

      // Map sang tên field trong DB
      const dbField = fieldMapping[frontendField] || frontendField;
      updateData[dbField] = value;
    }

    // Xử lý đổi mật khẩu nếu có
    if (body.new_password && body.old_password) {
      if (user.password !== body.old_password) {
        return res.status(400).json({ status: "Error", message: "Mật khẩu cũ không đúng" });
      }
      updateData.password = body.new_password;
    }

    // Cập nhật vào DB
    await User.updateOne({ student_code: targetId }, { $set: updateData });

    // Lấy lại user sau khi update
    const updatedUser = await User.findOne({ student_code: targetId }).select("-password");

    return res.json({ 
      status: "Success", 
      message: "Cập nhật thành công",
      data: {
        _id: updatedUser._id,
        student_code: updatedUser.student_code,
        name: updatedUser.full_name,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        role: updatedUser.role,
      }
    });
  } catch (error) {
    console.error(">>> [User Route] Lỗi cập nhật profile:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// Alias PUT cho POST
router.put("/profile/:id", authMiddleware, async (req, res) => {
  // Forward to POST handler
  req.method = "POST";
  return router.handle(req, res);
});

// ============================================
// PUT /api/user/:id/status - Cập nhật trạng thái hồ sơ (Admin only)
// ============================================
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    const requesterRole = req.user.role;

    // Chỉ admin mới được thay đổi status
    if (requesterRole !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền thay đổi trạng thái" });
    }

    // Validate status
    const validStatuses = ["Chờ duyệt", "Đang thực tập", "Đã hoàn thành", "Từ chối", "Đã duyệt"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        status: "Error", 
        message: `Trạng thái không hợp lệ. Các trạng thái hợp lệ: ${validStatuses.join(", ")}` 
      });
    }

    // Tìm user bằng student_code hoặc _id
    let user = await User.findOne({ student_code: id });
    if (!user) {
      user = await User.findById(id);
    }

    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy người dùng" });
    }

    // Cập nhật status (sync cả 2 field)
    const updateData = {
      internship_status: status,
      registration_status: status
    };

    // Nếu có admin_note (thường dùng khi từ chối)
    if (admin_note !== undefined) {
      updateData.admin_note = admin_note;
    }

    // Nếu duyệt, chuyển status thành "Đang thực tập"
    if (status === "Đã duyệt") {
      updateData.internship_status = "Đang thực tập";
      updateData.registration_status = "Đang thực tập";
    }

    await User.updateOne({ _id: user._id }, { $set: updateData });

    // Lấy lại user sau khi update
    const updatedUser = await User.findById(user._id).select("-password");

    // Emit notification qua Socket.IO nếu có
    const io = req.app.get("io");
    if (io) {
      io.to(user._id.toString()).emit("status_updated", {
        new_status: updatedUser.internship_status,
        admin_note: updatedUser.admin_note,
        message: status === "Từ chối" 
          ? "Hồ sơ của bạn đã bị từ chối" 
          : `Trạng thái hồ sơ đã được cập nhật: ${updatedUser.internship_status}`
      });
    }

    return res.json({ 
      status: "Success", 
      message: `Đã cập nhật trạng thái thành "${updatedUser.internship_status}"`,
      data: {
        _id: updatedUser._id,
        student_code: updatedUser.student_code,
        full_name: updatedUser.full_name,
        internship_status: updatedUser.internship_status,
        admin_note: updatedUser.admin_note
      }
    });
  } catch (error) {
    console.error(">>> [User Route] Lỗi cập nhật status:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// POST /api/user/upload/cv - Upload CV
// ============================================
router.post("/upload/cv", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Không có file được upload" });
    }

    const baseUrl = process.env.SERVER_URL || "http://localhost:5000";
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    // Update user's cv_url
    const studentCode = req.user.student_code;
    await User.updateOne({ student_code: studentCode }, { $set: { cv_url: fileUrl } });

    return res.json({
      status: "Success",
      message: "Upload CV thành công",
      data: {
        url: fileUrl,
        filename: req.file.originalname
      }
    });
  } catch (error) {
    console.error(">>> [User Route] Lỗi upload CV:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi upload file", error: error.message });
  }
});

// ============================================
// POST /api/user/upload/recommendation - Upload Thư giới thiệu
// ============================================
router.post("/upload/recommendation", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Không có file được upload" });
    }

    const baseUrl = process.env.SERVER_URL || "http://localhost:5000";
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    // Update user's recommendation_letter_url
    const studentCode = req.user.student_code;
    await User.updateOne({ student_code: studentCode }, { $set: { recommendation_letter_url: fileUrl } });

    return res.json({
      status: "Success",
      message: "Upload thư giới thiệu thành công",
      data: {
        url: fileUrl,
        filename: req.file.originalname
      }
    });
  } catch (error) {
    console.error(">>> [User Route] Lỗi upload thư giới thiệu:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi upload file", error: error.message });
  }
});

// ============================================
// POST /api/user/upload/avatar - Upload ảnh đại diện
// ============================================
router.post("/upload/avatar", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Không có file được upload" });
    }

    // Chỉ chấp nhận ảnh
    const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!allowedImageTypes.includes(ext)) {
      fs.unlinkSync(req.file.path); // Xóa file nếu không hợp lệ
      return res.status(400).json({ status: "Error", message: "Chỉ chấp nhận file ảnh (JPG, PNG, GIF)" });
    }

    const baseUrl = process.env.SERVER_URL || "http://localhost:5000";
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    // Update user's avatar (có thể thêm field avatar_url vào User model nếu cần)
    const studentCode = req.user.student_code;
    await User.updateOne({ student_code: studentCode }, { $set: { avatar_url: fileUrl } });

    return res.json({
      status: "Success",
      message: "Upload ảnh đại diện thành công",
      data: {
        url: fileUrl,
        filename: req.file.originalname
      }
    });
  } catch (error) {
    console.error(">>> [User Route] Lỗi upload avatar:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi upload file", error: error.message });
  }
});

// ============================================
// PUT /api/user/internship-registration - Student đăng ký thực tập
// ============================================
router.put("/internship-registration", authMiddleware, async (req, res) => {
  try {
    const studentCode = req.user.student_code;
    const userRole = req.user.role;

    // SECURITY: Chỉ student mới được gọi endpoint này
    if (userRole !== "student") {
      return res.status(403).json({ 
        status: "Error", 
        message: "Chỉ sinh viên mới có quyền đăng ký thực tập" 
      });
    }

    const user = await User.findOne({ student_code: studentCode });
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy người dùng" });
    }

    // Lấy dữ liệu từ request body
    const { 
      topic,              // Đề tài thực tập
      internship_unit,    // Đơn vị thực tập
      start_date,         // Ngày bắt đầu
      end_date,           // Ngày kết thúc
      cv_url,             // Link CV (đã upload trước đó)
      introduction_letter_url,  // Thư giới thiệu
      mentor_name,        // Tên người hướng dẫn tại doanh nghiệp
      mentor_email,       // Email người hướng dẫn
      mentor_phone        // SĐT người hướng dẫn
    } = req.body;

    // Validation
    if (!topic || !topic.trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập đề tài thực tập" });
    }
    if (!internship_unit || !internship_unit.trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập đơn vị thực tập" });
    }
    if (!start_date) {
      return res.status(400).json({ status: "Error", message: "Vui lòng chọn ngày bắt đầu" });
    }
    if (!end_date) {
      return res.status(400).json({ status: "Error", message: "Vui lòng chọn ngày kết thúc" });
    }

    // Kiểm tra ngày hợp lệ
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    if (endDateObj <= startDateObj) {
      return res.status(400).json({ status: "Error", message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }

    // Cập nhật thông tin đăng ký
    const updateData = {
      internship_topic: topic.trim(),
      internship_unit: internship_unit.trim(),
      start_date: startDateObj,
      end_date: endDateObj,
      // CRITICAL: Tự động set status = "Chờ duyệt"
      internship_status: "Chờ duyệt",
      registration_status: "Chờ duyệt"
    };

    // Optional fields
    if (cv_url) updateData.cv_url = cv_url;
    if (introduction_letter_url) updateData.recommendation_letter_url = introduction_letter_url;
    if (mentor_name) updateData.mentor_name = mentor_name.trim();
    if (mentor_email) updateData.mentor_email = mentor_email.trim();
    if (mentor_phone) updateData.mentor_phone = mentor_phone.trim();

    await User.updateOne({ student_code: studentCode }, { $set: updateData });

    // Lấy lại user sau khi update
    const updatedUser = await User.findOne({ student_code: studentCode }).select("-password");

    // Emit notification qua Socket.IO (thông báo cho Admin)
    const io = req.app.get("io");
    if (io) {
      // Gửi notification đến tất cả admin
      io.emit("new_registration", {
        student_code: updatedUser.student_code,
        student_name: updatedUser.full_name,
        topic: updatedUser.internship_topic,
        unit: updatedUser.internship_unit,
        message: `Sinh viên ${updatedUser.full_name} đã đăng ký thực tập`
      });
    }

    return res.json({
      status: "Success",
      message: "Đăng ký thành công! Hồ sơ đang chờ Giáo vụ duyệt.",
      data: {
        _id: updatedUser._id,
        student_code: updatedUser.student_code,
        full_name: updatedUser.full_name,
        internship_topic: updatedUser.internship_topic,
        internship_unit: updatedUser.internship_unit,
        start_date: updatedUser.start_date,
        end_date: updatedUser.end_date,
        internship_status: updatedUser.internship_status,
        cv_url: updatedUser.cv_url,
        recommendation_letter_url: updatedUser.recommendation_letter_url
      }
    });
  } catch (error) {
    console.error(">>> [User Route] Lỗi đăng ký thực tập:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// PUT /api/user/:id/evaluation - Admin đánh giá sinh viên
// ============================================
router.put("/:id/evaluation", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterRole = req.user.role;

    // SECURITY: Chỉ Admin mới được đánh giá
    if (requesterRole !== "admin") {
      return res.status(403).json({ 
        status: "Error", 
        message: "Chỉ Admin/Giáo vụ mới có quyền đánh giá sinh viên" 
      });
    }

    // Tìm user bằng student_code hoặc _id
    let user = await User.findOne({ student_code: id });
    if (!user) {
      user = await User.findById(id);
    }
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy sinh viên" });
    }

    const { 
      mentor_feedback,    // Nhận xét từ doanh nghiệp/Mentor
      report_score,       // Điểm báo cáo (0-10)
      final_grade,        // Điểm tổng kết (0-10) - tính tự động hoặc nhập tay
      final_status,       // Trạng thái: "Đạt" / "Không đạt"
      admin_note          // Ghi chú từ Admin (optional)
    } = req.body;

    const updateData = {};

    // Mentor feedback
    if (mentor_feedback !== undefined) {
      updateData.mentor_feedback = mentor_feedback;
    }

    // Report score (validate 0-10)
    if (report_score !== undefined) {
      const score = Number(report_score);
      if (isNaN(score) || score < 0 || score > 10) {
        return res.status(400).json({ status: "Error", message: "Điểm báo cáo phải từ 0-10" });
      }
      updateData.report_score = score;
    }

    // Final grade (validate 0-10)
    if (final_grade !== undefined) {
      const grade = Number(final_grade);
      if (isNaN(grade) || grade < 0 || grade > 10) {
        return res.status(400).json({ status: "Error", message: "Điểm tổng kết phải từ 0-10" });
      }
      updateData.final_grade = grade;
    }

    // Final status
    if (final_status !== undefined) {
      const validStatuses = ["Đạt", "Không đạt", "Pending"];
      if (!validStatuses.includes(final_status)) {
        return res.status(400).json({ 
          status: "Error", 
          message: `Trạng thái không hợp lệ. Chọn: ${validStatuses.join(", ")}` 
        });
      }
      updateData.final_status = final_status;

      // CRITICAL: Nếu "Đạt", set internship_status = "Đã hoàn thành"
      if (final_status === "Đạt") {
        updateData.internship_status = "Đã hoàn thành";
        updateData.registration_status = "Đã hoàn thành";
      }
    }

    // Admin note
    if (admin_note !== undefined) {
      updateData.admin_note = admin_note;
    }

    // Cập nhật vào DB
    await User.updateOne({ _id: user._id }, { $set: updateData });

    // Lấy lại user sau khi update
    const updatedUser = await User.findById(user._id).select("-password");

    // Emit notification cho sinh viên
    const io = req.app.get("io");
    if (io) {
      io.to(user._id.toString()).emit("evaluation_updated", {
        final_status: updatedUser.final_status,
        final_grade: updatedUser.final_grade,
        mentor_feedback: updatedUser.mentor_feedback,
        message: final_status === "Đạt" 
          ? "Chúc mừng! Bạn đã hoàn thành thực tập." 
          : "Kết quả đánh giá thực tập đã được cập nhật."
      });
    }

    return res.json({
      status: "Success",
      message: "Đã lưu đánh giá thành công",
      data: {
        _id: updatedUser._id,
        student_code: updatedUser.student_code,
        full_name: updatedUser.full_name,
        mentor_feedback: updatedUser.mentor_feedback,
        report_score: updatedUser.report_score,
        final_grade: updatedUser.final_grade,
        final_status: updatedUser.final_status,
        internship_status: updatedUser.internship_status,
        admin_note: updatedUser.admin_note
      }
    });
  } catch (error) {
    console.error(">>> [User Route] Lỗi đánh giá sinh viên:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/user/all - Lấy tất cả users (Admin only) 
// ============================================
router.get("/all", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Không có quyền truy cập" });
    }

    const { role, status } = req.query;
    let query = {};

    if (role) query.role = role;
    if (status) {
      query.$or = [
        { internship_status: status },
        { registration_status: status }
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    return res.json({ status: "Success", data: users });
  } catch (error) {
    console.error(">>> [User Route] Lỗi lấy all users:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
