# Cài đặt

## Yêu cầu hệ thống

| Phần mềm | Phiên bản | Ghi chú |
|----------|-----------|---------|
| Node.js | >= 14.x | Khuyến nghị v18+ |
| MongoDB | >= 4.4 | Chạy local hoặc Atlas |
| npm | >= 6.x | Đi kèm Node.js |
| Git | Mới nhất | Để clone repo |

## Bước 1: Clone repository

```bash
git clone <repository-url>
cd Test
```

## Bước 2: Cài đặt dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd client
npm install
cd ..
```

## Bước 3: Cấu hình MongoDB

### Option A: MongoDB Local
1. Cài đặt: https://www.mongodb.com/try/download/community
2. Khởi động:
   - **Windows**: Services → MongoDB → Start
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`
3. Kiểm tra: `mongosh` hoặc `mongo`

### Option B: MongoDB Atlas
1. Tạo tài khoản: https://www.mongodb.com/cloud/atlas
2. Tạo cluster miễn phí
3. Lấy connection string, cập nhật `config/db.js` hoặc dùng biến môi trường `MONGODB_URI`

**Mặc định:** `mongodb://localhost:27017/intern_system_v2`
