const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const InternshipPeriod = require("../models/InternshipPeriod");
const Company = require("../models/Company");
const { authMiddleware } = require("../middleware/auth");
const { getDashboardStats } = require("../controllers/adminController");

const router = express.Router();

// Định nghĩa cột dùng chung cho CSV và Excel
const EXPORT_HEADERS = [
  { key: 'student_code', label: 'MSSV' },
  { key: 'full_name', label: 'Họ và tên' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Số điện thoại' },
  { key: 'parent_number', label: 'SĐT phụ huynh' },
  { key: 'address', label: 'Địa chỉ' },
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

// Helper function để chuyển JSON sang CSV với UTF-8 BOM
function convertToCSV(data, headers) {
  const BOM = '\uFEFF'; // UTF-8 BOM để Excel hiển thị đúng tiếng Việt
  
  const headerRow = headers.map(h => `"${(h.label || h.key || '').replace(/"/g, '""')}"`).join(',');
  
  const rows = (Array.isArray(data) ? data : []).map(item => {
    const raw = item && typeof item.toObject === 'function' ? item.toObject() : (item || {});
    return headers.map(h => {
      let value = raw[h.key];
      if (value === null || value === undefined) return '""';
      // Mongoose ObjectId hoặc object
      if (typeof value === 'object' && value !== null) {
        if (value instanceof Date) {
          return `"${value.toLocaleDateString('vi-VN')}"`;
        }
        if (value.toString && value.toString() !== '[object Object]') {
          value = value.toString();
        } else {
          value = '';
        }
      }
      if (h.key.toLowerCase().includes('date')) {
        try {
          const d = new Date(value);
          if (!isNaN(d.getTime())) return `"${d.toLocaleDateString('vi-VN')}"`;
        } catch (_) {}
      }
      let strValue = String(value).replace(/"/g, '""');
      // SĐT: thêm tab đầu để Excel mở CSV không đổi thành số (tránh 8.13E+08, mất số 0 đầu)
      if ((h.key === 'phone' || h.key === 'parent_number') && strValue) strValue = '\t' + strValue;
      return `"${strValue}"`;
    }).join(',');
  }).join('\n');
  
  return BOM + headerRow + '\n' + rows;
}

// Middleware kiểm tra quyền Admin (Nhà trường – chỉ xem, duyệt đợt, không phân công không sửa điểm)
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ status: "Error", message: "Chỉ Admin/Giáo vụ mới có quyền truy cập" });
  }
  next();
};

// ============================================
// GET /api/admin/dashboard - Analytics Dashboard (Recharts-compatible)
// ============================================
router.get("/dashboard", authMiddleware, adminOnly, getDashboardStats);

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
// GET /api/admin/students - Lấy danh sách sinh viên (Admin CHỈ XEM, không sửa điểm không phân công)
// ============================================
router.get("/students", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, search, major, university, period_id } = req.query;

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

    // Tìm kiếm theo tên, mã SV hoặc email — khớp một phần (partial), escape ký tự đặc biệt regex
    if (search && search.trim()) {
      const escaped = String(search.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchConditions = {
        $or: [
          { full_name: { $regex: escaped, $options: "i" } },
          { student_code: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } }
        ]
      };
      if (query.$or) {
        query = { $and: [query, searchConditions] };
      } else {
        query = { ...query, ...searchConditions };
      }
    }

    // Lọc theo đợt thực tập: period_id có thể là ObjectId hoặc tên đợt (string)
    if (period_id) {
      if (mongoose.Types.ObjectId.isValid(period_id) && String(new mongoose.Types.ObjectId(period_id)) === String(period_id)) {
        query.internship_period_id = period_id;
      } else {
        query.internship_period = { $regex: RegExp(`^${String(period_id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), $options: "i" };
      }
    }

    // Sắp xếp theo MSSV tăng dần: SV001, SV002, ...
    const students = await User.find(query)
      .select("-password")
      .sort({ student_code: 1 })
      .lean();

    // Sanitize: internship_period không được chứa tên người (vd: "Nguyễn Văn A")
    const periodNamePattern = /^(đợt|kỳ|hè|đông|xuân|202\d|20\d\d)/i;
    const sanitizePeriod = (val) => {
      if (val == null || String(val).trim() === "") return null;
      const s = String(val).trim();
      if (periodNamePattern.test(s)) return s; // Hợp lệ
      // Nếu giống tên người (chỉ chữ, không số, < 50 ký tự) → coi là dữ liệu lỗi
      if (s.length < 50 && /^[A-ZÀ-Ỹa-zà-ỹ\s]+$/.test(s)) return null;
      return s;
    };

    const data = students.map(user => ({
      _id: user._id,
      student_code: user.student_code,
      name: user.full_name,  // Alias cho frontend cũ
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      phone_number: user.phone,  // Alias
      parent_number: user.parent_number,
      address: user.address,
      university: user.university,
      faculty: user.faculty,
      major: user.major,
      class_name: user.class_name,
      department: user.internship_unit,  // Alias
      internship_unit: user.internship_unit,
      internship_topic: user.internship_topic,
      internship_period: sanitizePeriod(user.internship_period),
      internship_period_id: user.internship_period_id,
      start_date: user.start_date,
      end_date: user.end_date,
      status: user.internship_status || user.registration_status,
      internship_status: user.internship_status,
      registration_status: user.registration_status,
      mentor_id: user.mentor_id,
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
      company_id: user.company_id,
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
    const { status, major, university, period_id } = req.query;

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
    if (period_id) {
      query.internship_period_id = period_id;
    }

    const students = await User.find(query)
      .select("-password")
      .sort({ student_code: 1 })
      .lean();

    // Convert sang CSV với BOM
    const csvData = convertToCSV(students, EXPORT_HEADERS);

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
// GET /api/admin/companies - Danh sách doanh nghiệp (all=true: tất cả để quản lý; mặc định chỉ is_active cho dropdown)
// ============================================
router.get("/companies", authMiddleware, adminOnly, async (req, res) => {
  try {
    const all = req.query.all === "1" || req.query.all === "true";
    const query = all ? {} : { is_active: true };
    const companies = await Company.find(query)
      .select(all ? "_id name field email phone is_active" : "_id name field email phone")
      .sort({ name: 1 })
      .lean();
    return res.json({
      status: "Success",
      data: companies.map(c => ({
        _id: c._id,
        name: c.name,
        field: c.field || null,
        email: c.email || null,
        phone: c.phone || null,
        ...(all && { is_active: c.is_active !== false })
      }))
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi lấy danh sách doanh nghiệp:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/admin/companies/:id - Chi tiết doanh nghiệp (chỉnh sửa)
// ============================================
router.get("/companies/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "Error", message: "ID doanh nghiệp không hợp lệ" });
    }
    const company = await Company.findById(id).lean();
    if (!company) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy doanh nghiệp" });
    }
    return res.json({
      status: "Success",
      data: {
        _id: company._id,
        name: company.name,
        address: company.address || "",
        email: company.email || "",
        phone: company.phone || "",
        field: company.field || "",
        website: company.website || "",
        contact_person: company.contact_person || "",
        description: company.description || "",
        is_active: company.is_active !== false,
      },
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi lấy chi tiết doanh nghiệp:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// PUT /api/admin/companies/:id - Cập nhật thông tin doanh nghiệp (email, SĐT, địa chỉ, ...)
// ============================================
router.put("/companies/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "Error", message: "ID doanh nghiệp không hợp lệ" });
    }
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy doanh nghiệp" });
    }

    const allowed = [
      "name",
      "address",
      "email",
      "phone",
      "field",
      "website",
      "contact_person",
      "description",
    ];
    const body = req.body || {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const v = body[key];
        company[key] = v == null ? "" : String(v).trim();
      }
    }

    if (company.email) {
      company.email = company.email.toLowerCase();
    }

    await company.save();

    return res.json({
      status: "Success",
      message: "Đã cập nhật thông tin doanh nghiệp.",
      data: {
        _id: company._id,
        name: company.name,
        address: company.address || null,
        email: company.email || null,
        phone: company.phone || null,
        field: company.field || null,
        website: company.website || null,
        contact_person: company.contact_person || null,
        description: company.description || null,
        is_active: company.is_active !== false,
      },
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({
        status: "Error",
        message: "Tên hoặc email doanh nghiệp bị trùng với bản ghi khác.",
      });
    }
    console.error(">>> [Admin Route] Lỗi cập nhật doanh nghiệp:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// PUT /api/admin/companies/:id/toggle-active - Vô hiệu hóa / Kích hoạt doanh nghiệp (ngừng hợp tác)
// ============================================
router.put("/companies/:id/toggle-active", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "Error", message: "ID doanh nghiệp không hợp lệ" });
    }
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy doanh nghiệp" });
    }
    company.is_active = company.is_active === false;
    await company.save();
    return res.json({
      status: "Success",
      message: company.is_active ? "Đã kích hoạt doanh nghiệp." : "Đã vô hiệu hóa doanh nghiệp (ngừng hợp tác).",
      data: { _id: company._id, name: company.name, is_active: company.is_active }
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi toggle active company:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// DELETE /api/admin/companies/:id - Xóa doanh nghiệp (chỉ khi không còn HR và SV liên kết)
// ============================================
router.delete("/companies/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "Error", message: "ID doanh nghiệp không hợp lệ" });
    }
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy doanh nghiệp" });
    }
    const hrCount = await User.countDocuments({ role: "company_hr", company_id: id });
    const studentCount = await User.countDocuments({ role: "student", company_id: id });
    const mentorCount = await User.countDocuments({ role: "mentor", company_id: id });
    if (hrCount > 0 || studentCount > 0 || mentorCount > 0) {
      return res.status(400).json({
        status: "Error",
        message: `Không thể xóa doanh nghiệp đang có liên kết: ${hrCount} HR, ${studentCount} sinh viên, ${mentorCount} mentor. Vui lòng chuyển hoặc xóa hết trước khi xóa doanh nghiệp.`
      });
    }
    await Company.deleteOne({ _id: id });
    return res.json({
      status: "Success",
      message: "Đã xóa doanh nghiệp.",
      data: { _id: id, name: company.name }
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi xóa doanh nghiệp:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// GET /api/admin/companies/:id/hrs - Danh sách HR của một doanh nghiệp
// ============================================
router.get("/companies/:id/hrs", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "Error", message: "ID doanh nghiệp không hợp lệ" });
    }

    const hrs = await User.find({ role: "company_hr", company_id: id })
      .select("_id student_code full_name email phone")
      .sort({ full_name: 1 })
      .lean();

    return res.json({ status: "Success", data: hrs });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi lấy danh sách HR:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// POST /api/admin/companies/:id/hrs - Tạo HR mới cho doanh nghiệp
// ============================================
router.post("/companies/:id/hrs", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { student_code, full_name, email, password, phone } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "Error", message: "ID doanh nghiệp không hợp lệ" });
    }
    if (!student_code || !String(student_code).trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập mã đăng nhập (student_code)" });
    }
    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập họ tên" });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ status: "Error", message: "Vui lòng nhập email" });
    }

    const company = await Company.findById(id).select("_id name");
    if (!company) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy doanh nghiệp" });
    }

    const existing = await User.findOne({
      $or: [
        { student_code: String(student_code).trim() },
        { email: String(email).trim().toLowerCase() }
      ]
    });
    if (existing) {
      return res.status(400).json({
        status: "Error",
        message: existing.student_code === String(student_code).trim()
          ? "Mã đăng nhập đã tồn tại"
          : "Email đã được sử dụng"
      });
    }

    const hashedPassword = await bcrypt.hash(password || "123456", 10);
    const hr = await User.create({
      student_code: String(student_code).trim(),
      full_name: String(full_name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role: "company_hr",
      company_id: company._id,
      phone: phone ? String(phone).trim() : null
    });

    const hrData = {
      _id: hr._id,
      student_code: hr.student_code,
      full_name: hr.full_name,
      email: hr.email,
      phone: hr.phone,
      role: hr.role
    };

    return res.json({
      status: "Success",
      message: `Đã tạo tài khoản HR cho doanh nghiệp ${company.name}`,
      data: hrData
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi tạo HR:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

// ============================================
// PUT /api/admin/students/:id - Admin CHỈ được cập nhật trạng thái duyệt + admin_note (không sửa điểm, không phân công mentor)
// ============================================
router.put("/students/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const user = await User.findOne({ student_code: id });
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy sinh viên" });
    }

    // Admin (Nhà trường) CHỈ được: duyệt/từ chối, ghi chú, đợt, gán doanh nghiệp – KHÔNG được sửa điểm, mentor_feedback, phân công mentor
    const allowedFields = [
      "internship_status", "registration_status", "status",
      "admin_note", "internship_period_id", "internship_period", "period_id",
      "company_id"
    ];

    const updateData = {};
    for (const [field, value] of Object.entries(updateFields)) {
      if (allowedFields.includes(field) && value !== undefined) {
        if (field === "status" || field === "internship_status" || field === "registration_status") {
          updateData.internship_status = value;
          updateData.registration_status = value;
        } else if (field === "internship_period_id" || field === "internship_period") {
          updateData[field] = value;
        } else if (field === "period_id") {
          // Resolve period_id to internship_period_id + name
          if (value && mongoose.Types.ObjectId.isValid(value)) {
            const period = await InternshipPeriod.findById(value).select("name code").lean();
            if (period) {
              updateData.internship_period_id = value;
              updateData.internship_period = period.name || period.code || String(value);
            }
          } else {
            updateData.internship_period_id = null;
            updateData.internship_period = null;
          }
        } else if (field === "company_id") {
          if (value && mongoose.Types.ObjectId.isValid(value)) {
            const company = await Company.findById(value).select("name").lean();
            if (company) {
              updateData.company_id = value;
              // Optional: đồng bộ tên công ty vào internship_unit nếu chưa có
              if (!user.internship_unit) {
                updateData.internship_unit = company.name;
              }
            }
          } else {
            updateData.company_id = null;
          }
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

// ============================================
// DELETE /api/admin/students/:id - Xóa sinh viên (Admin only, theo student_code)
// ============================================
router.delete("/students/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const studentCode = req.params.id;

    const user = await User.findOne({ student_code: studentCode, role: "student" });
    if (!user) {
      return res.status(404).json({ status: "Error", message: "Không tìm thấy sinh viên" });
    }

    await User.deleteOne({ student_code: studentCode });
    return res.json({
      status: "Success",
      message: "Đã xóa sinh viên",
    });
  } catch (error) {
    console.error(">>> [Admin Route] Lỗi xóa SV:", error.message);
    return res.status(500).json({ status: "Error", message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
