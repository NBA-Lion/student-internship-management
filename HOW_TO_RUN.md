# 🎓 Hệ thống Quản lý Thực tập Sinh viên

## 📋 Mô tả dự án

Hệ thống quản lý thực tập sinh viên với các tính năng:
- Quản lý sinh viên, giảng viên hướng dẫn, doanh nghiệp
- Import dữ liệu từ Excel
- Chat real-time giữa sinh viên và admin
- Theo dõi trạng thái hồ sơ thực tập
- Đánh giá kết quả thực tập

---

## 🛠️ Yêu cầu hệ thống

| Phần mềm | Phiên bản | Ghi chú |
|----------|-----------|---------|
| Node.js | >= 14.x | Khuyến nghị v18+ |
| MongoDB | >= 4.4 | Chạy local hoặc Atlas |
| npm | >= 6.x | Đi kèm Node.js |
| Git | Mới nhất | Để clone repo |

---

## 🚀 Hướng dẫn cài đặt

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd Test
```

### Bước 2: Cài đặt dependencies

#### Backend (Root folder):
```bash
# Trong thư mục gốc (Test/)
npm install
```

#### Frontend (Client folder):
```bash
# Di chuyển vào thư mục client
cd client
npm install
```

### Bước 3: Cấu hình MongoDB

#### Option A: MongoDB Local
1. Cài đặt MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Khởi động MongoDB service:
   - **Windows**: MongoDB tự chạy như service sau khi cài
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`

3. Kiểm tra MongoDB đã chạy:
```bash
mongosh
# hoặc
mongo
```

#### Option B: MongoDB Atlas (Cloud)
1. Tạo tài khoản tại https://www.mongodb.com/cloud/atlas
2. Tạo cluster miễn phí
3. Lấy connection string và thay thế trong `config/db.js`

**Mặc định**: Ứng dụng kết nối tới `mongodb://localhost:27017/intern_system_v2`

---

## ▶️ Chạy ứng dụng

### Cách 1: Chạy riêng từng phần (Khuyến nghị khi develop)

**Terminal 1 - Backend:**
```bash
# Trong thư mục gốc (Test/)
npm start
# hoặc dùng nodemon để auto-reload:
npm run dev
```

**Terminal 2 - Frontend:**
```bash
# Trong thư mục client/
cd client
npm start
```

### Cách 2: Chạy song song

**Windows (PowerShell):**
```powershell
# Mở 2 tab terminal
# Tab 1:
npm start

# Tab 2:
cd client && npm start
```

**Mac/Linux:**
```bash
# Chạy backend ở background
npm start &

# Chạy frontend
cd client && npm start
```

---

## 🌐 Truy cập ứng dụng

| Service | URL | Mô tả |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Giao diện người dùng |
| Backend API | http://localhost:5000 | REST API Server |
| Health Check | http://localhost:5000/health | Kiểm tra server status |

---

## 🗄️ Khởi tạo Database (Quan trọng!)

Sau khi cài đặt xong, bạn cần tạo dữ liệu mẫu để test:

### Chạy Seed Script:
```bash
# Trong thư mục gốc (Test/)
npm run seed
```

### Kết quả mong đợi:
```
🔌 Đang kết nối MongoDB...
✅ Đã kết nối MongoDB
📊 Số users hiện tại: 0
📝 Đang tạo dữ liệu mẫu...
  ✅ Tạo user: ADMIN - Trưởng Phòng Đào Tạo
  ✅ Tạo user: SV001 - Nguyễn Văn An
  ✅ Tạo user: SV002 - Trần Thị Bình
  ✅ Tạo user: SV003 - Lê Văn Cường
  ✅ Tạo user: SV004 - Phạm Thị Dung
  ✅ Tạo đợt thực tập: Kỳ thực tập 2024-1
  ✅ Tạo đợt thực tập: Kỳ thực tập Hè 2024
  ✅ Tạo doanh nghiệp: FPT Software
  ✅ Tạo doanh nghiệp: Viettel Solutions
  ✅ Tạo doanh nghiệp: VNPT Technology
  ✅ Tạo doanh nghiệp: Samsung Vietnam

🎉 Seed dữ liệu thành công!
```

---

## 👤 Tài khoản mặc định

Sau khi chạy seed, sử dụng các tài khoản sau để đăng nhập:

### Admin:
```
Username: ADMIN
Password: 123
```

### Sinh viên test:
| Username | Password | Trạng thái |
|----------|----------|------------|
| SV001 | 123 | Chờ duyệt |
| SV002 | 123 | Đang thực tập |
| SV003 | 123 | Đã hoàn thành |
| SV004 | 123 | Từ chối |

> **Lưu ý**: Nếu quên chạy seed, bạn sẽ không đăng nhập được!

---

## 📁 Cấu trúc thư mục

```
Test/
├── client/                 # Frontend (React)
│   ├── public/
│   ├── src/
│   │   ├── _components/   # Shared components
│   │   ├── _helpers/      # Utilities
│   │   ├── _services/     # API services
│   │   ├── account/       # Login/Register pages
│   │   ├── admin/         # Admin pages
│   │   └── App.jsx
│   └── package.json
│
├── config/                # Database config
│   └── db.js
├── middleware/            # Express middlewares
│   └── auth.js
├── models/                # Mongoose schemas
│   ├── User.js
│   ├── Company.js
│   ├── InternshipPeriod.js
│   └── Message.js
├── routes/                # API routes
│   ├── auth.js
│   ├── user.js
│   ├── admin.js
│   ├── import.js
│   ├── period.js
│   └── chat.js
├── uploads/               # Uploaded files
├── server.js              # Main server file
├── package.json
└── HOW_TO_RUN.md         # This file
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký |

### User
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/user/profile/me` | Lấy profile user hiện tại |
| POST | `/api/user/profile/:id` | Cập nhật profile |
| PUT | `/api/user/internship-registration` | Đăng ký thực tập |

### Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin/students` | Danh sách sinh viên |
| PUT | `/api/user/:id/status` | Duyệt/từ chối hồ sơ |
| PUT | `/api/user/:id/evaluation` | Đánh giá kết quả |

### Import (Excel)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/import/users?role=student` | Import sinh viên |
| POST | `/api/import/users?role=lecturer` | Import giảng viên |
| POST | `/api/import/companies` | Import doanh nghiệp |
| POST | `/api/import/batches` | Import đợt thực tập |
| POST | `/api/import/grades` | Import kết quả |
| POST | `/api/import/status` | Import trạng thái |

---

## 🔧 Troubleshooting

### ❌ Lỗi: MongoDB không kết nối được
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Giải pháp:**
- Kiểm tra MongoDB đã chạy: `mongosh` hoặc `mongo`
- Windows: Mở Services.msc, tìm "MongoDB", click Start
- Kiểm tra port 27017 không bị chặn

### ❌ Lỗi: Port đã được sử dụng
```
Error: listen EADDRINUSE :::5000
```
**Giải pháp:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>

# Hoặc dùng:
npx kill-port 5000
```

### ❌ Lỗi: OpenSSL Legacy Provider (Frontend)
```
Error: error:0308010C:digital envelope routines::unsupported
```
**Giải pháp:** Đã được fix trong `package.json`:
```json
"start": "set NODE_OPTIONS=--openssl-legacy-provider && react-scripts start"
```

### ❌ Lỗi: Cannot find module 'xxx'
**Giải pháp:**
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### ❌ Lỗi: ResizeObserver loop
**Giải pháp:** Đã được fix trong `App.jsx`. Nếu vẫn lỗi:
- Clear cache browser (Ctrl+Shift+Delete)
- Hard reload (Ctrl+Shift+R)

---

## 📝 Lưu ý quan trọng

1. **Luôn chạy Backend TRƯỚC Frontend** để đảm bảo API sẵn sàng
2. **Giữ cả 2 terminal mở** khi đang develop
3. **MongoDB phải chạy** trước khi start backend
4. Frontend có **proxy** đến backend (đã config trong `client/package.json`)
5. Các file upload được lưu trong thư mục `uploads/`

---

## 🎨 Công nghệ sử dụng

### Backend
- **Express.js** - Web framework
- **MongoDB + Mongoose** - Database
- **Socket.IO** - Real-time chat
- **JWT** - Authentication
- **Multer** - File upload
- **XLSX** - Excel parsing

### Frontend
- **React 17** - UI Library
- **Recoil** - State management
- **Ant Design** - UI Components
- **Material-UI** - UI Components
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time

---

## 📞 Hỗ trợ

Nếu gặp vấn đề khi cài đặt hoặc chạy ứng dụng:
1. Kiểm tra phần Troubleshooting ở trên
2. Đọc log lỗi trong terminal
3. Kiểm tra Console browser (F12 > Console)
4. Tạo issue trên GitHub repository

---

**Happy Coding! 🚀**
