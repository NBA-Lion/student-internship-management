const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const User = require("../models/User");
const Company = require("../models/Company");
const InternshipPeriod = require("../models/InternshipPeriod");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ============================================
// FILE UPLOAD CONFIG FOR EXCEL FILES
// ============================================
const uploadDir = path.join(__dirname, "..", "uploads", "imports");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `import_${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// ============================================
// HELPER: Parse Excel file to JSON
// ============================================
function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  return data;
}

// ============================================
// HELPER: Vietnamese Header Mapping
// ============================================
const HEADER_MAPPINGS = {
  // User/Student fields
  "Mã sinh viên": "student_code",
  "MSSV": "student_code",
  "VNU-ID": "student_code",
  "Họ tên": "full_name",
  "Họ và tên": "full_name",
  "Tên": "full_name",
  "Email": "email",
  "SĐT": "phone",
  "Số điện thoại": "phone",
  "Ngày sinh": "dob",
  "Giới tính": "gender",
  "Quê quán": "location",
  "Username": "username",
  "Password": "password",
  "Vai trò": "role",
  
  // Lecturer fields
  "Mã GV": "student_code",       // Use student_code as unique identifier
  "Mã giảng viên": "student_code",
  "Khoa": "department",
  "Khoa/Viện": "department",
  
  // Company fields
  "Tên công ty": "name",
  "Tên doanh nghiệp": "name",
  "Địa chỉ": "address",
  "Email liên hệ": "email",
  "Lĩnh vực": "field",
  "Website": "website",
  
  // Internship Batch fields
  "Mã đợt": "code",
  "Tên đợt": "name",
  "Ngày bắt đầu": "start_date",
  "Ngày kết thúc": "end_date",
  
  // Internship Result fields
  "Điểm thực tập": "final_grade",
  "Điểm báo cáo": "report_score",
  "Nhận xét": "mentor_feedback",
  "Đánh giá": "mentor_feedback",
  "Mã đợt": "batch_code"
};

function mapHeaders(row) {
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = HEADER_MAPPINGS[key] || key.toLowerCase().replace(/\s+/g, "_");
    mapped[mappedKey] = value;
  }
  return mapped;
}

// ============================================
// HELPER: Parse Vietnamese date formats
// ============================================
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // If already a Date object
  if (dateStr instanceof Date) return dateStr;
  
  // If it's a number (Excel serial date)
  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateStr * 86400000);
  }
  
  // Try parsing string formats
  const str = String(dateStr).trim();
  
  // DD/MM/YYYY format
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(ddmmyyyy[3], ddmmyyyy[2] - 1, ddmmyyyy[1]);
  }
  
  // YYYY-MM-DD format
  const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    return new Date(yyyymmdd[1], yyyymmdd[2] - 1, yyyymmdd[3]);
  }
  
  // Try native parsing
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ============================================
// POST /api/import/users - Import Students or Lecturers
// ============================================
router.post("/users", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    // Check admin permission
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    // Parse Excel file
    const rawData = parseExcelFile(req.file.path);
    
    if (rawData.length === 0) {
      return res.status(400).json({ status: "Error", message: "File không có dữ liệu" });
    }

    // Get role from query or detect from data
    const targetRole = req.query.role || req.body.role || "student";
    const defaultPassword = "123456";

    const registered = [];
    const failed = [];
    const bulkOps = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = mapHeaders(rawData[i]);
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Validate required fields
        const studentCode = row.student_code || row.username;
        const fullName = row.full_name || row.name;
        const email = row.email;

        if (!studentCode) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu mã sinh viên/giảng viên`, rowNum });
          continue;
        }
        if (!fullName) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu họ tên`, rowNum });
          continue;
        }
        if (!email) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu email`, rowNum });
          continue;
        }

        // ============================================
        // SAFEGUARD: Determine role with strict validation
        // NEVER allow 'admin' role from import
        // ============================================
        let role = row.role || targetRole;
        
        // CRITICAL: Prevent creating admin accounts via import
        if (role === 'admin') {
          console.warn(`>>> [Import] Blocked admin role assignment for: ${studentCode}`);
          role = 'student'; // Force to student
        }

        // Auto-detect role based on student_code pattern
        const codeUpper = String(studentCode).trim().toUpperCase();
        if (codeUpper.startsWith('SV') || codeUpper.match(/^\d{8,}$/)) {
          // Student code pattern: SV001, 20210001, etc.
          role = 'student';
        } else if (codeUpper.startsWith('GV') || codeUpper.startsWith('LEC')) {
          // Lecturer code pattern: GV001, LEC001
          role = 'lecturer';
        }

        // Only allow 'student' or 'lecturer' from import
        if (!['student', 'lecturer'].includes(role)) {
          role = 'student';
        }

        // Prepare user data
        const userData = {
          student_code: String(studentCode).trim(),
          full_name: String(fullName).trim(),
          email: String(email).trim().toLowerCase(),
          password: row.password || defaultPassword,
          role: role, // Sanitized role
          phone: row.phone ? String(row.phone).trim() : undefined,
          gender: row.gender,
          dob: parseDate(row.dob),
        };

        // Additional fields based on role
        if (role === "lecturer") {
          userData.department = row.department || row.faculty;
          userData.faculty = row.department || row.faculty;
        } else {
          // Student fields
          userData.university = row.university;
          userData.faculty = row.faculty;
          userData.major = row.major;
          userData.class_name = row.class_name;
          userData.location = row.location;
        }

        // Clean undefined values
        Object.keys(userData).forEach(key => {
          if (userData[key] === undefined || userData[key] === "") {
            delete userData[key];
          }
        });

        // Upsert operation (by student_code for students, email for lecturers)
        const filter = role === "lecturer" 
          ? { email: userData.email }
          : { student_code: userData.student_code };

        bulkOps.push({
          updateOne: {
            filter: filter,
            update: { $set: userData },
            upsert: true
          }
        });

        registered.push({
          student_code: userData.student_code,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role
        });

      } catch (rowError) {
        failed.push({ ...row, error: `Dòng ${rowNum}: ${rowError.message}`, rowNum });
      }
    }

    // Execute bulk write
    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await User.bulkWrite(bulkOps, { ordered: false });
    }

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    return res.json({
      status: failed.length === 0 ? "Success" : "Partial",
      message: {
        registered: registered,
        failed: failed,
        summary: {
          total: rawData.length,
          success: registered.length,
          failed: failed.length,
          upserted: bulkResult?.upsertedCount || 0,
          modified: bulkResult?.modifiedCount || 0
        }
      }
    });

  } catch (error) {
    console.error(">>> [Import] Error importing users:", error);
    
    // Cleanup file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      status: "Error", 
      message: "Lỗi import: " + error.message 
    });
  }
});

// ============================================
// POST /api/import/companies - Import Companies
// ============================================
router.post("/companies", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    const rawData = parseExcelFile(req.file.path);
    
    if (rawData.length === 0) {
      return res.status(400).json({ status: "Error", message: "File không có dữ liệu" });
    }

    const registered = [];
    const failed = [];
    const bulkOps = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = mapHeaders(rawData[i]);
      const rowNum = i + 2;

      try {
        const name = row.name || row.company_name;
        
        if (!name) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu tên công ty`, rowNum });
          continue;
        }

        const companyData = {
          name: String(name).trim(),
          address: row.address ? String(row.address).trim() : undefined,
          email: row.email ? String(row.email).trim().toLowerCase() : undefined,
          field: row.field ? String(row.field).trim() : undefined,
          website: row.website ? String(row.website).trim() : undefined,
          phone: row.phone ? String(row.phone).trim() : undefined,
          contact_person: row.contact_person ? String(row.contact_person).trim() : undefined,
          is_active: true
        };

        // Clean undefined values
        Object.keys(companyData).forEach(key => {
          if (companyData[key] === undefined || companyData[key] === "") {
            delete companyData[key];
          }
        });

        // Upsert by company name or email
        const filter = { 
          $or: [
            { name: companyData.name },
            ...(companyData.email ? [{ email: companyData.email }] : [])
          ]
        };

        bulkOps.push({
          updateOne: {
            filter: { name: companyData.name },
            update: { $set: companyData },
            upsert: true
          }
        });

        registered.push({
          name: companyData.name,
          email: companyData.email,
          field: companyData.field
        });

      } catch (rowError) {
        failed.push({ ...row, error: `Dòng ${rowNum}: ${rowError.message}`, rowNum });
      }
    }

    // Execute bulk write
    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await Company.bulkWrite(bulkOps, { ordered: false });
    }

    // Cleanup
    fs.unlinkSync(req.file.path);

    return res.json({
      status: failed.length === 0 ? "Success" : "Partial",
      message: {
        registered: registered,
        failed: failed,
        summary: {
          total: rawData.length,
          success: registered.length,
          failed: failed.length,
          upserted: bulkResult?.upsertedCount || 0,
          modified: bulkResult?.modifiedCount || 0
        }
      }
    });

  } catch (error) {
    console.error(">>> [Import] Error importing companies:", error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      status: "Error", 
      message: "Lỗi import: " + error.message 
    });
  }
});

// ============================================
// POST /api/import/batches - Import Internship Batches
// ============================================
router.post("/batches", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    const rawData = parseExcelFile(req.file.path);
    
    if (rawData.length === 0) {
      return res.status(400).json({ status: "Error", message: "File không có dữ liệu" });
    }

    const registered = [];
    const failed = [];
    const bulkOps = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = mapHeaders(rawData[i]);
      const rowNum = i + 2;

      try {
        const code = row.code || row.batch_code || row.batch_id;
        const name = row.name || row.batch_name;
        const startDate = parseDate(row.start_date);
        const endDate = parseDate(row.end_date);

        if (!code) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu mã đợt`, rowNum });
          continue;
        }
        if (!name) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu tên đợt`, rowNum });
          continue;
        }
        if (!startDate) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Ngày bắt đầu không hợp lệ`, rowNum });
          continue;
        }
        if (!endDate) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Ngày kết thúc không hợp lệ`, rowNum });
          continue;
        }
        if (endDate <= startDate) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Ngày kết thúc phải sau ngày bắt đầu`, rowNum });
          continue;
        }

        const batchData = {
          code: String(code).trim(),
          name: String(name).trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: row.is_active !== false && row.is_active !== "false" && row.is_active !== 0,
          description: row.description ? String(row.description).trim() : undefined
        };

        // Clean undefined values
        Object.keys(batchData).forEach(key => {
          if (batchData[key] === undefined) {
            delete batchData[key];
          }
        });

        // Upsert by batch code
        bulkOps.push({
          updateOne: {
            filter: { code: batchData.code },
            update: { $set: batchData },
            upsert: true
          }
        });

        registered.push({
          code: batchData.code,
          name: batchData.name,
          start_date: batchData.start_date,
          end_date: batchData.end_date
        });

      } catch (rowError) {
        failed.push({ ...row, error: `Dòng ${rowNum}: ${rowError.message}`, rowNum });
      }
    }

    // Execute bulk write
    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await InternshipPeriod.bulkWrite(bulkOps, { ordered: false });
    }

    // Cleanup
    fs.unlinkSync(req.file.path);

    return res.json({
      status: failed.length === 0 ? "Success" : "Partial",
      message: {
        registered: registered,
        failed: failed,
        summary: {
          total: rawData.length,
          success: registered.length,
          failed: failed.length,
          upserted: bulkResult?.upsertedCount || 0,
          modified: bulkResult?.modifiedCount || 0
        }
      }
    });

  } catch (error) {
    console.error(">>> [Import] Error importing batches:", error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      status: "Error", 
      message: "Lỗi import: " + error.message 
    });
  }
});

// ============================================
// POST /api/import/grades - Import Internship Results/Grades
// ============================================
router.post("/grades", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    const rawData = parseExcelFile(req.file.path);
    
    if (rawData.length === 0) {
      return res.status(400).json({ status: "Error", message: "File không có dữ liệu" });
    }

    const registered = [];
    const failed = [];
    const bulkOps = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = mapHeaders(rawData[i]);
      const rowNum = i + 2;

      try {
        const studentCode = row.student_code || row.vnu_id || row.mssv;

        if (!studentCode) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu mã sinh viên`, rowNum });
          continue;
        }

        // Check if student exists
        const student = await User.findOne({ student_code: String(studentCode).trim() });
        if (!student) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Không tìm thấy sinh viên ${studentCode}`, rowNum });
          continue;
        }

        // Prepare update data
        const updateData = {};

        // Report score
        if (row.report_score !== undefined && row.report_score !== "") {
          const score = Number(row.report_score);
          if (isNaN(score) || score < 0 || score > 10) {
            failed.push({ ...row, error: `Dòng ${rowNum}: Điểm báo cáo phải từ 0-10`, rowNum });
            continue;
          }
          updateData.report_score = score;
        }

        // Final grade
        if (row.final_grade !== undefined && row.final_grade !== "") {
          const grade = Number(row.final_grade);
          if (isNaN(grade) || grade < 0 || grade > 10) {
            failed.push({ ...row, error: `Dòng ${rowNum}: Điểm tổng kết phải từ 0-10`, rowNum });
            continue;
          }
          updateData.final_grade = grade;
        }

        // Mentor feedback
        if (row.mentor_feedback) {
          updateData.mentor_feedback = String(row.mentor_feedback).trim();
        }

        // Auto-determine final_status based on grade
        if (updateData.final_grade !== undefined) {
          updateData.final_status = updateData.final_grade >= 5 ? "Đạt" : "Không đạt";
          
          // If passed, mark internship as completed
          if (updateData.final_status === "Đạt") {
            updateData.internship_status = "Đã hoàn thành";
            updateData.registration_status = "Đã hoàn thành";
          }
        }

        if (Object.keys(updateData).length === 0) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Không có dữ liệu để cập nhật`, rowNum });
          continue;
        }

        bulkOps.push({
          updateOne: {
            filter: { student_code: String(studentCode).trim() },
            update: { $set: updateData }
          }
        });

        registered.push({
          student_code: studentCode,
          full_name: student.full_name,
          report_score: updateData.report_score,
          final_grade: updateData.final_grade,
          final_status: updateData.final_status
        });

      } catch (rowError) {
        failed.push({ ...row, error: `Dòng ${rowNum}: ${rowError.message}`, rowNum });
      }
    }

    // Execute bulk write
    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await User.bulkWrite(bulkOps, { ordered: false });
    }

    // Cleanup
    fs.unlinkSync(req.file.path);

    return res.json({
      status: failed.length === 0 ? "Success" : "Partial",
      message: {
        registered: registered,
        failed: failed,
        summary: {
          total: rawData.length,
          success: registered.length,
          failed: failed.length,
          modified: bulkResult?.modifiedCount || 0
        }
      }
    });

  } catch (error) {
    console.error(">>> [Import] Error importing grades:", error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      status: "Error", 
      message: "Lỗi import: " + error.message 
    });
  }
});

// ============================================
// POST /api/import/status - Import Status Updates
// ============================================
router.post("/status", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    const rawData = parseExcelFile(req.file.path);
    
    if (rawData.length === 0) {
      return res.status(400).json({ status: "Error", message: "File không có dữ liệu" });
    }

    const validStatuses = ["Chờ duyệt", "Đang thực tập", "Đã hoàn thành", "Từ chối", "Đã duyệt"];
    const registered = [];
    const failed = [];
    const bulkOps = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = mapHeaders(rawData[i]);
      const rowNum = i + 2;

      try {
        const studentCode = row.student_code || row.vnu_id;
        const status = row.status;

        if (!studentCode) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu mã sinh viên`, rowNum });
          continue;
        }

        if (!status) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu trạng thái`, rowNum });
          continue;
        }

        if (!validStatuses.includes(status)) {
          failed.push({ 
            ...row, 
            error: `Dòng ${rowNum}: Trạng thái không hợp lệ. Chọn: ${validStatuses.join(", ")}`, 
            rowNum 
          });
          continue;
        }

        // Normalize status
        let normalizedStatus = status;
        if (status === "Đã duyệt") {
          normalizedStatus = "Đang thực tập";
        }

        bulkOps.push({
          updateOne: {
            filter: { student_code: String(studentCode).trim() },
            update: { 
              $set: { 
                internship_status: normalizedStatus,
                registration_status: normalizedStatus
              } 
            }
          }
        });

        registered.push({
          student_code: studentCode,
          status: normalizedStatus
        });

      } catch (rowError) {
        failed.push({ ...row, error: `Dòng ${rowNum}: ${rowError.message}`, rowNum });
      }
    }

    // Execute bulk write
    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await User.bulkWrite(bulkOps, { ordered: false });
    }

    // Cleanup
    fs.unlinkSync(req.file.path);

    return res.json({
      status: failed.length === 0 ? "Success" : "Partial",
      message: {
        registered: registered,
        failed: failed,
        summary: {
          total: rawData.length,
          success: registered.length,
          failed: failed.length,
          modified: bulkResult?.modifiedCount || 0
        }
      }
    });

  } catch (error) {
    console.error(">>> [Import] Error importing status:", error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      status: "Error", 
      message: "Lỗi import: " + error.message 
    });
  }
});

module.exports = router;
