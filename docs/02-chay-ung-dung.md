# Chạy ứng dụng

## Chạy Backend + Frontend

**Terminal 1 - Backend:**
```bash
npm start
# hoặc: npm run dev (nodemon)
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

### Windows (PowerShell) - 2 tab
```powershell
# Tab 1: npm start
# Tab 2: cd client && npm start
```

## Truy cập

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health Check | http://localhost:5000/health |

## Khởi tạo Database (Seed)

```bash
npm run seed
```

Tạo các user mẫu: ADMIN, SV001, SV002, SV003, SV004 và dữ liệu liên quan.

## Tài khoản mặc định

| Username | Password | Vai trò |
|----------|----------|---------|
| ADMIN | 123 | Admin |
| SV001 | 123 | Sinh viên (Chờ duyệt) |
| SV002 | 123 | Sinh viên (Đang thực tập) |
| SV003 | 123 | Sinh viên (Đã hoàn thành) |
| SV004 | 123 | Sinh viên (Từ chối) |

> **Lưu ý:** Phải chạy seed trước khi đăng nhập!
