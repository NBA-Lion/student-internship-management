        const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const User = require("../models/User");
const Company = require("../models/Company");
const InternshipPeriod = require("../models/InternshipPeriod");
const { authMiddleware } = require("../middleware/auth");
const { logActivity } = require("../services/activityService");

const router = express.Router();

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

function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  return data;
}

/** Set of normalized headers that indicate "student code" column (for finding header row). */
function getStudentCodeNormalizedSet() {
  const aliases = INTERNSHIP_RESULT_ALIASES.student_code;
  return new Set(aliases.map(a => normalizeHeader(String(a))));
}

/** Parse Excel for grades (kết quả thực tập): tìm dòng header chứa cột mã SV (Mã sinh viên, MSSV, Mã SV, ...) rồi map các dòng sau. Chịu file có dòng tiêu đề phía trên. Có thể truyền filePath (string) hoặc buffer (Buffer). Returns { data, headerRowIndex }. */
function parseExcelFileWithHeaderDetection(filePathOrBuffer) {
  const workbook = Buffer.isBuffer(filePathOrBuffer)
    ? XLSX.read(filePathOrBuffer, { type: "buffer" })
    : XLSX.readFile(filePathOrBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!rows || rows.length === 0) return { data: [], headerRowIndex: 0 };

  const studentCodeNormSet = getStudentCodeNormalizedSet();
  let headerRowIndex = -1;
  let headerRow = null;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell != null && studentCodeNormSet.has(normalizeHeader(String(cell)))) {
        headerRowIndex = r;
        headerRow = row.map(c => {
          if (c == null) return "";
          const s = String(c).replace(/^\uFEFF/, "").trim();
          return s;
        });
        break;
      }
    }
    if (headerRowIndex >= 0) break;
  }

  if (headerRowIndex < 0 || !headerRow || headerRow.length === 0) {
    if (rows.length >= 2) {
      const firstRow = rows[0];
      const secondRow = rows[1];
      const firstRowNonEmpty = Array.isArray(firstRow) ? firstRow.filter(c => c != null && String(c).trim() !== "").length : 0;
      if (firstRowNonEmpty <= 1 && Array.isArray(secondRow) && secondRow.some(c => c != null && String(c).trim() !== "")) {
        headerRowIndex = 1;
        headerRow = secondRow.map(c => (c != null ? String(c).replace(/^\uFEFF/, "").trim() : ""));
      }
    }
    if (headerRowIndex < 0 || !headerRow || headerRow.length === 0) {
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      return { data, headerRowIndex: 0 };
    }
  }

  const data = [];
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const raw = rows[r];
    if (!Array.isArray(raw)) continue;
    const obj = {};
    for (let c = 0; c < headerRow.length; c++) {
      let key = headerRow[c] || `col_${c}`;
      key = key.replace(/^\uFEFF/, "").trim() || `col_${c}`;
      obj[key] = raw[c] != null ? raw[c] : "";
    }
    data.push(obj);
  }
  return { data, headerRowIndex };
}

/** Parse Excel kết quả thực tập THEO VỊ TRÍ CỘT (không dùng tên cột): dòng 1 = header (bỏ qua), từ dòng 2: Cột A=0 Mã SV, B=1 Mã đợt, C=2 Điểm, D=3 Nhận xét. Truyền filePath (string) hoặc buffer. */
function parseGradesByColumnIndex(filePathOrBuffer) {
  const workbook = Buffer.isBuffer(filePathOrBuffer)
    ? XLSX.read(filePathOrBuffer, { type: "buffer" })
    : XLSX.readFile(filePathOrBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!rows || rows.length < 2) return { data: [], headerRowIndex: 0 };
  const data = [];
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    if (!Array.isArray(raw)) continue;
    let student_code = raw[0] != null ? String(raw[0]).trim() : "";
    if (!student_code) {
      for (let j = 0; j < Math.min(raw.length, 5); j++) {
        const v = raw[j] != null ? String(raw[j]).trim() : "";
        if (v && !/^\d+(\.\d+)?$/.test(v) && v.length <= 30) {
          student_code = v;
          break;
        }
      }
    }
    const batch_code = raw[1] != null ? String(raw[1]).trim() : "";
    const score = raw[2];
    const comment = raw[3] != null ? String(raw[3]).trim() : "";
    if (student_code === "" && batch_code === "" && (score === undefined || score === "") && comment === "") continue;
    data.push({ student_code, batch_code, score, comment });
  }
  return { data, headerRowIndex: 0 };
}

/** Parse Excel cập nhật trạng thái THEO VỊ TRÍ CỘT: dòng 1 = header (bỏ qua), từ dòng 2: Cột A=0 Mã SV, B=1 Trạng thái. */
function parseStatusByColumnIndex(filePathOrBuffer) {
  const workbook = Buffer.isBuffer(filePathOrBuffer)
    ? XLSX.read(filePathOrBuffer, { type: "buffer" })
    : XLSX.readFile(filePathOrBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!rows || rows.length < 2) return { data: [], headerRowIndex: 0 };
  const data = [];
  const validStatusesSet = new Set(["Chờ duyệt", "Đang thực tập", "Đã hoàn thành", "Từ chối", "Đã duyệt"]);
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    if (!Array.isArray(raw)) continue;
    let student_code = raw[0] != null ? String(raw[0]).trim() : "";
    if (!student_code) {
      for (let j = 0; j < Math.min(raw.length, 5); j++) {
        const v = raw[j] != null ? String(raw[j]).trim() : "";
        if (v && !validStatusesSet.has(v) && v.length <= 30) {
          student_code = v;
          break;
        }
      }
    }
    let status = raw[1] != null ? String(raw[1]).trim() : "";
    if (!status && raw.length > 1) {
      for (let j = 1; j < Math.min(raw.length, 5); j++) {
        const v = raw[j] != null ? String(raw[j]).trim() : "";
        if (v && validStatusesSet.has(v)) {
          status = v;
          break;
        }
      }
    }
    if (student_code === "" && status === "") continue;
    data.push({ student_code, status });
  }
  return { data, headerRowIndex: 0 };
}

/** Parse kết quả thực tập theo tên cột: tìm dòng header (Mã SV, MSSV, VNU-ID, ...), map từng dòng. */
function parseGradesWithHeaderDetection(filePathOrBuffer) {
  const { data: rawRows } = parseExcelFileWithHeaderDetection(filePathOrBuffer);
  const result = [];
  for (const row of rawRows) {
    const mapped = mapRowToInternshipResult(row);
    let student_code = (mapped.student_code && String(mapped.student_code).trim()) || getFirstColumnAsStudentCode(row);
    if (student_code) student_code = String(student_code).trim();
    const batch_code = mapped.batch_code != null ? String(mapped.batch_code).trim() : "";
    const score = mapped.score;
    const comment = mapped.comment != null ? String(mapped.comment).trim() : "";
    if (!student_code && !batch_code && (score === undefined || score === null || String(score).trim() === "") && !comment) continue;
    result.push({ student_code: student_code || "", batch_code, score, comment });
  }
  return { data: result, headerRowIndex: 0 };
}

/** Parse cập nhật trạng thái theo tên cột: tìm dòng header (Mã SV, VNU-ID, Trạng thái, ...), map từng dòng. */
const VALID_STATUSES_SET = new Set(["Chờ duyệt", "Đang thực tập", "Đã hoàn thành", "Từ chối", "Đã duyệt"]);

function getFirstColumnAsStatusStudentCode(rawRow) {
  if (!rawRow || typeof rawRow !== "object") return undefined;
  const statusNormSet = new Set((STATUS_IMPORT_ALIASES.status || []).map(a => normalizeHeader(String(a))));
  for (const [header, value] of Object.entries(rawRow)) {
    const v = value != null ? String(value).trim() : "";
    if (v === "") continue;
    const norm = normalizeHeader(header);
    if (statusNormSet.has(norm)) continue;
    if (VALID_STATUSES_SET.has(v)) continue;
    if (v.length <= 30) return v;
  }
  return undefined;
}

function parseStatusWithHeaderDetection(filePathOrBuffer) {
  const { data: rawRows } = parseExcelFileWithHeaderDetection(filePathOrBuffer);
  const result = [];
  for (const row of rawRows) {
    const mapped = mapRowToStatusResult(row);
    let student_code = (mapped.student_code && String(mapped.student_code).trim()) || getFirstColumnAsStatusStudentCode(row);
    if (student_code) student_code = String(student_code).trim();
    let status = mapped.status != null ? String(mapped.status).trim() : "";
    if (!student_code && !status) continue;
    result.push({ student_code: student_code || "", status });
  }
  return { data: result, headerRowIndex: 0 };
}

const SMART_ALIASES_USER = {
  student_code: ["MSSV", "Mã SV", "Mã sinh viên", "Student Code", "VNU-ID", "ID", "Mã GV", "Mã giảng viên"],
  full_name:     ["Họ và tên", "Họ tên", "Tên", "Full Name", "Name"],
  email:         ["Email", "Địa chỉ Email", "Thư điện tử", "Email liên hệ"],
  dob:           ["Ngày sinh", "Date of Birth", "DOB"],
  phone:         ["Số điện thoại", "SĐT", "Phone", "Tel"],
  parent_number: ["SĐT phụ huynh", "Số ĐT phụ huynh", "Phone (Parent)", "Parent Phone"],
  address:       ["Địa chỉ", "Address", "Địa chỉ liên hệ", "Location", "Quê quán"],
  gender:        ["Giới tính", "Gender"],
  location:      ["Quê quán", "Location"],  // Legacy: map vào address khi build userData
  username:      ["Username", "Tên đăng nhập"],
  password:      ["Password", "Mật khẩu"],
  role:          ["Vai trò", "Role"],
  class_name:    ["Lớp", "Class", "Lớp sinh hoạt"],
  department:    ["Khoa", "Khoa/Viện", "Faculty", "Department"],
  faculty:       ["Khoa", "Khoa/Viện", "Faculty"],
  university:    ["Trường", "University"],
  major:         ["Ngành", "Major"],
};

// Flatten: for legacy mapHeaders (company, batch, etc.) we keep a single key -> field map
const HEADER_MAPPINGS_LEGACY = {
  "Tên công ty": "name", "Tên doanh nghiệp": "name", "Địa chỉ": "address",
  "Email liên hệ": "email", "Lĩnh vực": "field", "Website": "website",
  "Mã đợt": "code", "Tên đợt": "name", "Ngày bắt đầu": "start_date", "Ngày kết thúc": "end_date",
  "batch_id": "code", "batch_code": "code", "batch_name": "name",
  "Mã đợt thực tập": "code", "Tên đợt thực tập": "name",
  "Điểm thực tập": "final_grade", "Điểm báo cáo": "report_score", "Nhận xét": "mentor_feedback",
  "Đánh giá": "mentor_feedback", "Mã đợt": "batch_code",
  "Mã sinh viên": "student_code"
};

const INTERNSHIP_RESULT_ALIASES = {
  student_code: [
    "mssv", "mã sinh viên", "mã sv", "student code", "student_id", "mã số sinh viên",
    "ma sinh vien", "ma sv", "student code", "student id", "ma so sinh vien",
    "vnu-id", "vnu id", "VNU-ID", "mã số sv", "ma so sv"
  ],
  score: [
    "điểm", "điểm thực tập", "score", "grade", "result", "điểm tổng kết",
    "diem", "diem thuc tap", "grade", "result", "diem tong ket",
    "final_grade", "điểm báo cáo", "diem bao cao", "report_score"
  ],
  comment: [
    "nhận xét", "đánh giá", "comment", "ghi chú", "mentor_feedback",
    "nhan xet", "danh gia", "ghi chu"
  ],
  batch_code: [
    "mã đợt", "mã đợt thực tập", "batch", "batch_code", "batch_id", "period", "period_code",
    "ma dot", "ma dot thuc tap", "period code"
  ]
};

/** Get first value from raw row whose header (normalized) matches any alias for the given field. */
function getValueByInternshipAlias(rawRow, fieldName) {
  const aliases = INTERNSHIP_RESULT_ALIASES[fieldName];
  if (!aliases || !rawRow || typeof rawRow !== "object") return undefined;
  const normalizedAliases = new Set(aliases.map(a => normalizeHeader(String(a))));
  for (const [header, value] of Object.entries(rawRow)) {
    const norm = normalizeHeader(header);
    if (normalizedAliases.has(norm)) {
      const v = value != null ? String(value).trim() : "";
      if (fieldName === "comment") return v;
      return v !== "" ? v : undefined;
    }
  }
  return undefined;
}

/** Normalized header sets for score/comment/batch (để fallback không nhầm cột). */
const SCORE_COMMENT_BATCH_NORMALIZED = new Set([
  ...(INTERNSHIP_RESULT_ALIASES.score || []).map(a => normalizeHeader(String(a))),
  ...(INTERNSHIP_RESULT_ALIASES.comment || []).map(a => normalizeHeader(String(a))),
  ...(INTERNSHIP_RESULT_ALIASES.batch_code || []).map(a => normalizeHeader(String(a)))
]);

/** Fallback: lấy giá trị cột đầu tiên (theo thứ tự key) không phải điểm/nhận xét/mã đợt làm mã SV. Bỏ qua giá trị thuần số (điểm). */
function getFirstColumnAsStudentCode(rawRow) {
  if (!rawRow || typeof rawRow !== "object") return undefined;
  for (const [header, value] of Object.entries(rawRow)) {
    const v = value != null ? String(value).trim() : "";
    if (v === "") continue;
    if (/^\d+(\.\d+)?$/.test(v)) continue; // bỏ qua số thuần (điểm)
    const norm = normalizeHeader(header);
    if (SCORE_COMMENT_BATCH_NORMALIZED.has(norm)) continue;
    return v;
  }
  return undefined;
}

/** Map raw Excel row to normalized internship result keys using INTERNSHIP_RESULT_ALIASES. */
function mapRowToInternshipResult(rawRow) {
  if (!rawRow || typeof rawRow !== "object") return {};
  const student_code = getValueByInternshipAlias(rawRow, "student_code") || getFirstColumnAsStudentCode(rawRow);
  return {
    student_code: student_code || undefined,
    score: getValueByInternshipAlias(rawRow, "score"),
    comment: getValueByInternshipAlias(rawRow, "comment"),
    batch_code: getValueByInternshipAlias(rawRow, "batch_code")
  };
}

const STATUS_IMPORT_ALIASES = {
  student_code: [
    "mssv", "mã sinh viên", "mã sv", "student code", "student_id", "mã số sinh viên",
    "ma sinh vien", "ma sv", "student id", "ma so sinh vien",
    "vnu-id", "vnu id", "VNU-ID", "mã số sv", "ma so sv"
  ],
  status: [
    "trạng thái", "status", "tình trạng", "trạng thái thực tập", "registration_status",
    "internship_status", "trang thai", "tinh trang", "trang thai thuc tap"
  ]
};

function getValueByStatusAlias(rawRow, fieldName) {
  const aliases = STATUS_IMPORT_ALIASES[fieldName];
  if (!aliases || !rawRow || typeof rawRow !== "object") return undefined;
  const normalizedAliases = new Set(aliases.map(a => normalizeHeader(String(a))));
  for (const [header, value] of Object.entries(rawRow)) {
    const norm = normalizeHeader(header);
    if (normalizedAliases.has(norm)) {
      const v = value != null ? String(value).trim() : "";
      return v !== "" ? v : undefined;
    }
  }
  return undefined;
}

/** Map raw Excel row to { student_code, status } for status import. */
function mapRowToStatusResult(rawRow) {
  if (!rawRow || typeof rawRow !== "object") return {};
  return {
    student_code: getValueByStatusAlias(rawRow, "student_code"),
    status: getValueByStatusAlias(rawRow, "status")
  };
}

/** Get value from raw row by matching any alias for the given field (case-insensitive). Returns first matching cell value (including empty string). */
function getValueByAliases(row, fieldName) {
  const aliases = SMART_ALIASES_USER[fieldName];
  if (!aliases) return undefined;
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const lower = alias.toLowerCase().trim();
    for (const key of rowKeys) {
      if (key != null && String(key).toLowerCase().trim() === lower) {
        return row[key]; // may be undefined, null, "", or value
      }
    }
  }
  return undefined;
}

/** Map raw Excel row to normalized user/student fields using smart aliases. */
function mapUserRow(row) {
  const mapped = {};
  for (const field of Object.keys(SMART_ALIASES_USER)) {
    const val = getValueByAliases(row, field);
    if (val !== undefined) mapped[field] = val;
  }
  return mapped;
}

// Aliases cho cột "Mã đợt" (để tìm dòng header trong file Excel đợt thực tập)
const BATCH_CODE_NORM_SET = new Set([
  "ma dot", "mã đợt", "ma dot thuc tap", "code", "batch", "batch_id", "batch_code",
  "period", "period_code", "ma dot thuc tap"
].map(a => normalizeHeaderStatic(a)));

function normalizeHeaderStatic(s) {
  if (s == null || typeof s !== "string") return "";
  return String(s).replace(/^\uFEFF/, "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

/** Parse Excel đợt thực tập: tìm dòng có cột "Mã đợt" làm header, hỗ trợ file có dòng tiêu đề phía trên */
function parseExcelFileWithBatchHeaderDetection(filePathOrBuffer) {
  const workbook = Buffer.isBuffer(filePathOrBuffer)
    ? XLSX.read(filePathOrBuffer, { type: "buffer" })
    : XLSX.readFile(filePathOrBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!rows || rows.length === 0) return { data: [], headerRowIndex: 0 };

  let headerRowIndex = -1;
  let headerRow = null;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = Array.isArray(rows[r]) ? rows[r] : [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell != null && BATCH_CODE_NORM_SET.has(normalizeHeaderStatic(String(cell)))) {
        headerRowIndex = r;
        headerRow = row.map(c => (c != null ? String(c).replace(/^\uFEFF/, "").trim() : ""));
        break;
      }
    }
    if (headerRowIndex >= 0) break;
  }

  if (headerRowIndex < 0 || !headerRow || headerRow.length === 0) {
    // Fallback: dùng dòng đầu tiên
    headerRow = Array.isArray(rows[0]) ? rows[0].map(c => (c != null ? String(c).replace(/^\uFEFF/, "").trim() : "")) : [];
    headerRowIndex = 0;
  }

  const data = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const obj = {};
    for (let j = 0; j < headerRow.length; j++) {
      const h = headerRow[j];
      if (h) obj[h] = row[j] != null ? row[j] : "";
    }
    if (Object.keys(obj).length > 0) data.push(obj);
  }
  return { data, headerRowIndex };
}

// Chuẩn hóa tiêu đề cột: trim, bỏ BOM, lowercase, bỏ dấu (để khớp khi Excel lưu khác encoding)
function normalizeHeader(s) {
  if (s == null || typeof s !== "string") return "";
  return String(s)
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function mapHeaders(row) {
  const mapped = {};
  const legacyByNormalized = {};
  for (const [k, v] of Object.entries(HEADER_MAPPINGS_LEGACY)) {
    const n = normalizeHeader(k);
    if (!legacyByNormalized[n]) legacyByNormalized[n] = v;
  }
  for (const [key, value] of Object.entries(row)) {
    const exact = HEADER_MAPPINGS_LEGACY[key];
    const byNorm = legacyByNormalized[normalizeHeader(key)];
    const mappedKey = exact || byNorm || key.toLowerCase().replace(/\s+/g, "_");
    mapped[mappedKey] = value;
  }
  return mapped;
}

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

const AUTO_EMAIL_DOMAIN = process.env.IMPORT_AUTO_EMAIL_DOMAIN || "student.intern.local";

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
      const row = mapUserRow(rawData[i]); // TASK 1: Smart mapping
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Validate required fields (student_code, full_name)
        const studentCode = row.student_code || row.username;
        const fullName = row.full_name || row.name;
        let email = row.email;

        if (!studentCode) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu mã sinh viên/giảng viên`, rowNum });
          continue;
        }
        if (!fullName) {
          failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu họ tên`, rowNum });
          continue;
        }

        // TASK 2: Auto-Email — if missing or empty, generate from student_code
        const codeStr = String(studentCode).trim();
        if (!email || String(email).trim() === "") {
          email = `${codeStr}@${AUTO_EMAIL_DOMAIN}`;
          console.warn(`>>> [Import] Dòng ${rowNum}: Thiếu email → tự sinh: ${email}`);
        } else {
          email = String(email).trim().toLowerCase();
        }

        let role = row.role || targetRole;
        
        // CRITICAL: Prevent creating admin accounts via import
        if (role === 'admin') {
          console.warn(`>>> [Import] Blocked admin role assignment for: ${studentCode}`);
          role = 'student'; // Force to student
        }

        // Auto-detect role based on student_code pattern
        const codeUpper = codeStr.toUpperCase();
        if (codeUpper.startsWith('SV') || codeUpper.match(/^\d{8,}$/)) {
          role = 'student';
        } else if (codeUpper.startsWith('GV') || codeUpper.startsWith('LEC')) {
          role = 'lecturer';
        }

        if (!['student', 'lecturer'].includes(role)) {
          role = 'student';
        }

        // TASK 2: Phone as string (preserve leading zeros)
        const phoneVal = row.phone;
        const phone = phoneVal !== undefined && phoneVal !== null && String(phoneVal).trim() !== ""
          ? String(phoneVal).trim()
          : undefined;

        // TASK 2: Date parsing (Excel serial or dd/mm/yyyy)
        const dobParsed = parseDate(row.dob);

        // Prepare user data
        const userData = {
          student_code: codeStr,
          full_name: String(fullName).trim(),
          email: email,
          password: row.password && String(row.password).trim() !== "" ? String(row.password).trim() : defaultPassword, // TASK 2: default 123456
          role: role,
          phone: phone,
          gender: row.gender ? String(row.gender).trim() : undefined,
          dob: dobParsed,
        };

        // Additional fields based on role
        if (role === "lecturer") {
          userData.department = row.department || row.faculty;
          userData.faculty = row.department || row.faculty;
        } else {
          userData.university = row.university;
          userData.faculty = row.faculty;
          userData.major = row.major;
          userData.class_name = row.class_name;
          userData.parent_number = row.parent_number ? String(row.parent_number).trim() : undefined;
          userData.address = (row.address || row.location) ? String(row.address || row.location).trim() : undefined;
        }

        // Clean undefined / empty
        Object.keys(userData).forEach(key => {
          if (userData[key] === undefined || userData[key] === "") {
            delete userData[key];
          }
        });

        // Upsert operation
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

router.post("/batches", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    // Hỗ trợ file Excel có dòng tiêu đề không nằm ở dòng 1 (tìm dòng chứa "Mã đợt")
    const { data: rawData } = parseExcelFileWithBatchHeaderDetection(req.file.path);
    
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
          batch_id: batchData.code,   // Alias cho bảng hiển thị (DBPortal dùng batch_id)
          batch_name: batchData.name, // Alias cho bảng hiển thị (DBPortal dùng batch_name)
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

    if (registered.length > 0) {
      await logActivity({
        type: "import",
        title: `Import danh sách đợt thực tập: ${registered.length} đợt.`,
        user_id: req.user?._id,
        meta: { count: registered.length, failed: failed.length },
      });
    }

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

router.post("/grades", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    let rawData = [];
    const byHeader = parseGradesWithHeaderDetection(fileBuffer);
    if (byHeader.data && byHeader.data.length > 0) {
      rawData = byHeader.data;
    } else {
      const byIndex = parseGradesByColumnIndex(fileBuffer);
      rawData = byIndex.data || [];
    }

    if (rawData.length === 0) {
      return res.status(400).json({ status: "Error", message: "File không có dữ liệu (cần ít nhất 1 dòng dữ liệu sau dòng tiêu đề). Đảm bảo có cột Mã sinh viên/MSSV/VNU-ID và Điểm/Nhận xét." });
    }

    const registered = [];
    const failed = [];
    const bulkOps = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2;
      const displayRow = {
        "Mã sinh viên": row.student_code,
        "Mã đợt": row.batch_code,
        "Điểm thực tập": row.score,
        "Nhận xét": row.comment
      };

      try {
        const studentCode = row.student_code || "";

        if (!studentCode) {
          failed.push({ ...displayRow, error: `Dòng ${rowNum}: Thiếu mã sinh viên`, rowNum });
          continue;
        }

        const student = await User.findOne({ student_code: studentCode });
        if (!student) {
          failed.push({ ...displayRow, error: `Dòng ${rowNum}: Sinh viên không tồn tại (${studentCode})`, rowNum });
          continue;
        }

        const updateData = {};

        if (row.score !== undefined && row.score !== null && String(row.score).trim() !== "") {
          const grade = Number(row.score);
          if (Number.isNaN(grade) || grade < 0 || grade > 10) {
            failed.push({ ...displayRow, error: `Dòng ${rowNum}: Điểm phải từ 0-10`, rowNum });
            continue;
          }
          updateData.final_grade = grade;
          updateData.final_status = grade >= 5 ? "Đạt" : "Không đạt";
          if (updateData.final_status === "Đạt") {
            updateData.internship_status = "Đã hoàn thành";
            updateData.registration_status = "Đã hoàn thành";
          }
        }

        if (row.comment !== undefined && row.comment !== null && String(row.comment).trim() !== "") {
          updateData.mentor_feedback = String(row.comment).trim();
        }

        if (row.batch_code && String(row.batch_code).trim()) {
          const period = await InternshipPeriod.findOne({ code: String(row.batch_code).trim() }).select("_id name");
          if (period) {
            updateData.internship_period_id = period._id;
            updateData.internship_period = period.name || row.batch_code;
          }
        }

        if (Object.keys(updateData).length === 0) {
          failed.push({ ...displayRow, error: `Dòng ${rowNum}: Không có dữ liệu để cập nhật (điểm/nhận xét)`, rowNum });
          continue;
        }

        bulkOps.push({
          updateOne: {
            filter: { student_code: studentCode },
            update: { $set: updateData }
          }
        });

        registered.push({
          student_code: studentCode,
          full_name: student.full_name,
          final_grade: updateData.final_grade,
          final_status: updateData.final_status
        });
      } catch (rowError) {
        failed.push({ ...displayRow, error: `Dòng ${rowNum}: ${rowError.message}`, rowNum });
      }
    }

    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await User.bulkWrite(bulkOps, { ordered: false });
    }

    fs.unlinkSync(req.file.path);

    if (registered.length > 0) {
      await logActivity({
        type: "import",
        title: `Import kết quả thực tập: ${registered.length} sinh viên.`,
        user_id: req.user?._id,
        meta: { count: registered.length, failed: failed.length },
      });
    }

    return res.json({
      status: failed.length === 0 ? "Success" : "Partial",
      message: {
        registered,
        failed,
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
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ status: "Error", message: "Lỗi import: " + error.message });
  }
});

router.post("/status", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "Error", message: "Chỉ Admin mới có quyền import" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "Error", message: "Vui lòng upload file Excel" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    let rawData = [];
    const byHeader = parseStatusWithHeaderDetection(fileBuffer);
    if (byHeader.data && byHeader.data.length > 0) {
      rawData = byHeader.data;
    } else {
      const byIndex = parseStatusByColumnIndex(fileBuffer);
      rawData = byIndex.data || [];
    }

    if (rawData.length === 0) {
      return res.status(400).json({ status: "Error", message: "File không có dữ liệu (cần ít nhất 1 dòng dữ liệu sau dòng tiêu đề). Đảm bảo có cột Mã sinh viên/MSSV/VNU-ID và Trạng thái." });
    }

    const validStatuses = ["Chờ duyệt", "Đang thực tập", "Đã hoàn thành", "Từ chối", "Đã duyệt"];
    const registered = [];
    const failed = [];
    const bulkOps = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2;
      const displayRow = { "Mã sinh viên": row.student_code, "Trạng thái": row.status };

      try {
        const studentCode = row.student_code || "";
        const statusRaw = row.status || "";

        if (!studentCode) {
          failed.push({ ...displayRow, error: `Dòng ${rowNum}: Thiếu mã sinh viên`, rowNum });
          continue;
        }

        const student = await User.findOne({ student_code: studentCode });
        if (!student) {
          failed.push({ ...displayRow, error: `Dòng ${rowNum}: Sinh viên không tồn tại (${studentCode})`, rowNum });
          continue;
        }

        if (!statusRaw) {
          failed.push({ ...displayRow, error: `Dòng ${rowNum}: Thiếu trạng thái`, rowNum });
          continue;
        }

        if (!validStatuses.includes(statusRaw)) {
          failed.push({
            ...displayRow,
            error: `Dòng ${rowNum}: Trạng thái không hợp lệ. Chọn: ${validStatuses.join(", ")}`,
            rowNum
          });
          continue;
        }

        let normalizedStatus = statusRaw;
        if (statusRaw === "Đã duyệt") {
          normalizedStatus = "Đang thực tập";
        }

        bulkOps.push({
          updateOne: {
            filter: { student_code: studentCode },
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
        failed.push({ ...displayRow, error: `Dòng ${rowNum}: ${rowError.message}`, rowNum });
      }
    }

    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await User.bulkWrite(bulkOps, { ordered: false });
    }

    fs.unlinkSync(req.file.path);

    if (registered.length > 0) {
      await logActivity({
        type: "import",
        title: `Cập nhật trạng thái thực tập: ${registered.length} sinh viên.`,
        user_id: req.user?._id,
        meta: { count: registered.length, failed: failed.length },
      });
    }

    return res.json({
      status: failed.length === 0 ? "Success" : "Partial",
      message: {
        registered,
        failed,
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
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ status: "Error", message: "Lỗi import: " + error.message });
  }
});

module.exports = router;
