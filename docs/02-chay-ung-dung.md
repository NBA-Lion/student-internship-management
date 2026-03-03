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

---

## Khôi phục dữ liệu MongoDB từ `db-dump` (dùng khi chấm/bàn giao)

Ngoài cách seed dữ liệu mẫu, project có kèm **bản dump MongoDB** trong thư mục:

- `db-dump/intern_system_v2/` (xuất từ database `intern_system_v2` trên máy).

### 1. Yêu cầu

- Đã cài **MongoDB** và **MongoDB Database Tools** (có `mongorestore.exe`).
- Biết đường dẫn tới thư mục chứa tools, ví dụ:
  - `C:\Program Files\MongoDB\Tools\100.14\bin`

### 2. Lệnh khôi phục (PowerShell)

```powershell
cd "C:\Program Files\MongoDB\Tools\100.14\bin"   # thư mục có mongorestore.exe

mongorestore `
  --db intern_system_v2 `
  --drop `
  "E:\Code\React\Test\db-dump\intern_system_v2"
```

Trong đó:

- `--db intern_system_v2`: tên database (trùng với cấu hình trong `config/db.js`).
- `--drop`: xóa dữ liệu cũ (nếu có) trước khi restore.
- Đường dẫn cuối cùng (`E:\Code\React\Test\...`) cần chỉnh lại cho đúng vị trí project trên máy của bạn.

Sau khi restore xong:

- Chạy backend + frontend như ở phần trên.
- **Không bắt buộc chạy lại `npm run seed`** nếu đã restore dữ liệu thật từ `db-dump`.

## Tài khoản mặc định

| Username | Password | Vai trò |
|----------|----------|---------|
| ADMIN | 123 | Admin |
| SV001 | 123 | Sinh viên (Chờ duyệt) |
| SV002 | 123 | Sinh viên (Đang thực tập) |
| SV003 | 123 | Sinh viên (Đã hoàn thành) |
| SV004 | 123 | Sinh viên (Từ chối) |

> **Lưu ý:** Phải chạy seed trước khi đăng nhập!
