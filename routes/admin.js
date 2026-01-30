const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Helper function để chuyển JSON sang CSV với UTF-8 BOM
function convertToCSV(data, headers) {
  const BOM = '\uFEFF'; // UTF-8 BOM để Excel hiển thị đúng tiếng Việt
  
  // Tạo header row
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  
  // Tạo data rows
  const rows = data.map(item => {
    return headers.map(h => {
      const value = item[h.key];
      if (value === null || value === undefined) return '""';
      
      // Format date
      if (h.key.includes('date') || h.key.includes('Date')) {
        if (value) {
          const date = new Date(value);
          return `"${date.toLocaleDateString('vi-VN')}"`;
        }
        return '""';
      }
      
      // Escape quotes và wrap in quotes
      const strValue = String(value).replace(/"/g, '""');
      return `"${strValue}"`;
    }).join(',');
  }).join('\n');
  
  return BOM + headerRow + '\n' + rows;
}

// Middleware kiểm tra quyền Admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền truy cập" });
  }
  next();
};

// ============================================
// GET /api/admin/stats - Thống kê cho Dashboard Admin
// ============================================
router.get("/stats", authMiddleware, adminOnly, async (req, res) => {
  try {
    // Đếm tổng số sinh viên
    const total = await User.countDocuments({ role: "student" });

    // Đếm số hồ sơ chờ duyệt
    const pending = await User.countDocuments({ 
      role: "student",
      $or: [
        { internship_status: "Chờ duyệt" },
        { registration_status: "Chờ duyệt" }
      ]
    });

    // Đếm số sinh viên đang thực tập
    const interning = await User.countDocuments({ 
      role: "student",
      $or: [
        { internship_status: "Đang thực tập" },
        { registration_status: "Đang thực tập" }
      ]
    });

    // Đếm số sinh viên đã hoàn thành
    const completed = await User.countDocuments({ 
      role: "student",
      $or: [
        { internship_status: "Đã hoàn thành" },
        { registration_status: "Đã hoàn thành" },
        { registration_status: "Hoàn thành" }
      ]
    });

    return res.json({
      status: "Success",
      data: {
        total,
        pending,
        interning,
        completed
      }
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi lấy thống kê:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/admin/students - Lấy danh sách sinh viên
// ============================================
router.get("/students", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, search, major, university } = req.query;

    let query = { role: "student" };

    // Lọc theo status nếu có
    if (status) {
      query.$or = [
        { internship_status: status },
        { registration_status: status }
      ];
    }

    // Lọc theo major
    if (major) {
      query.major = { $regex: major, $options: 'i' };
    }

    // Lọc theo university
    if (university) {
      query.university = { $regex: university, $options: 'i' };
    }

    // Tìm kiếm theo tên hoặc mã SV nếu có
    if (search) {
      const searchConditions = {
        $or: [
          { full_name: { $regex: search, $options: 'i' } },
          { student_code: { $regex: search, $options: 'i' } }
        ]
      };
      
      if (query.$or) {
        // Nếu đã có $or từ status filter, cần kết hợp với $and
        query = { $and: [query, searchConditions] };
      } else {
        query = { ...query, ...searchConditions };
      }
    }

    const students = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    // Map dữ liệu cho frontend (đảm bảo tương thích với cả field cũ và mới)
    const data = students.map(user => ({
      _id: user._id,
      student_code: user.student_code,
      name: user.full_name,  // Alias cho frontend cũ
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      phone_number: user.phone,  // Alias
      university: user.university,
      faculty: user.faculty,
      major: user.major,
      class_name: user.class_name,
      department: user.internship_unit,  // Alias
      internship_unit: user.internship_unit,
      internship_topic: user.internship_topic,
      start_date: user.start_date,
      end_date: user.end_date,
      status: user.internship_status || user.registration_status,
      internship_status: user.internship_status,
      registration_status: user.registration_status,
      mentor_name: user.mentor_name,
      mentor_email: user.mentor_email,
      mentor_phone: user.mentor_phone,
      mentor_feedback: user.mentor_feedback,
      report_score: user.report_score,
      final_grade: user.final_grade,
      final_status: user.final_status,
      admin_note: user.admin_note,
      cv_url: user.cv_url,
      recommendation_letter_url: user.recommendation_letter_url,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    return res.json({ status: "Success", data });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi lấy danh sách SV:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// Alias route cho compatibility với code cũ
router.get("/users/all", authMiddleware, adminOnly, async (req, res) => {
  // Forward tới /students handler
  req.url = '/students';
  return router.handle(req, res);
});

// ============================================
// GET /api/admin/export/csv - Xuất danh sách sinh viên ra CSV
// ============================================
router.get("/export/csv", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, major, university } = req.query;

    let query = { role: "student" };

    // Áp dụng filters giống như /students endpoint
    if (status) {
      query.$or = [
        { internship_status: status },
        { registration_status: status }
      ];
    }
    if (major) {
      query.major = { $regex: major, $options: 'i' };
    }
    if (university) {
      query.university = { $regex: university, $options: 'i' };
    }

    const students = await User.find(query)
      .select("-password")
      .sort({ student_code: 1 });

    // Định nghĩa headers cho CSV
    const headers = [
      { key: 'student_code', label: 'MSSV' },
      { key: 'full_name', label: 'Họ và tên' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Số điện thoại' },
      { key: 'university', label: 'Trường' },
      { key: 'faculty', label: 'Khoa' },
      { key: 'major', label: 'Ngành' },
      { key: 'class_name', label: 'Lớp' },
      { key: 'internship_unit', label: 'Đơn vị thực tập' },
      { key: 'internship_topic', label: 'Đề tài' },
      { key: 'start_date', label: 'Ngày bắt đầu' },
      { key: 'end_date', label: 'Ngày kết thúc' },
      { key: 'internship_status', label: 'Trạng thái' },
      { key: 'mentor_name', label: 'Người hướng dẫn' },
      { key: 'mentor_feedback', label: 'Nhận xét' },
      { key: 'report_score', label: 'Điểm báo cáo' },
      { key: 'final_grade', label: 'Điểm tổng kết' },
      { key: 'final_status', label: 'Kết quả' }
    ];

    // Convert sang CSV với BOM
    const csvData = convertToCSV(students, headers);

    // Set headers để browser download file
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Danh_sach_sinh_vien_${Date.now()}.csv"`);
    
    return res.send(csvData);
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi export CSV:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi xuất CSV", error: error.message });
  }
});

// ============================================
// PUT /api/admin/students/:id - Cập nhật thông tin sinh viên (Admin)
// ============================================
router.put("/students/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const user = await User.findOne({ student_code: id });
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy sinh viên" });
    }

    // Admin có thể cập nhật các trường sau
    const allowedFields = [
      "internship_status", "registration_status", "status",
      "mentor_name", "mentor_email", "mentor_phone",
      "mentor_feedback", "report_score", "final_grade", "final_status",
      "admin_note", "internship_unit", "internship_topic",
      "start_date", "end_date"
    ];

    const updateData = {};
    for (const [field, value] of Object.entries(updateFields)) {
      if (allowedFields.includes(field) && value !== undefined) {
        // Sync internship_status và registration_status
        if (field === "status" || field === "internship_status" || field === "registration_status") {
          updateData.internship_status = value;
          updateData.registration_status = value;
        } else {
          updateData[field] = value;
        }
      }
    }

    await User.updateOne({ student_code: id }, { $set: updateData });

    const updatedUser = await User.findOne({ student_code: id }).select("-password");

    return res.json({
      status: "Success",
      message: "Cập nhật thành công",
      data: updatedUser
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi cập nhật SV:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
