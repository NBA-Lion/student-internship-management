# Test trên local

## 0. Cài đặt lần đầu (bắt buộc)

Trước khi chạy, cần cài dependency:

**Thư mục gốc (backend):**
```bash
npm install
```

**Frontend (client):**
```bash
cd client
npm install
```

Nếu chưa chạy hai lệnh trên, app có thể lỗi khi mở (trang trắng) hoặc **bấm nút không thấy gì** (thiếu thư viện hiển thị thông báo).

---

## 1. Chuẩn bị

### MongoDB
- Cài MongoDB và **chạy service** (trên máy local).
- Backend mặc định kết nối: `mongodb://127.0.0.1:27017/intern_system_v2`.
- Nếu dùng URI khác: tạo file `.env` ở **thư mục gốc** (cùng cấp `server.js`):
  ```
  MONGODB_URI=mongodb://127.0.0.1:27017/ten_db_cua_ban
  PORT=5000
  ```

### Không bắt buộc thêm gì
- Frontend dev: tự dùng `http://localhost:5000` cho API và Socket.
- Backend dev: port `5000`, CORS đã cho `http://localhost:3000`.

---

## 2. Chạy

**Terminal 1 – Backend:**
```bash
npm start
```
Hoặc `npm run dev` (nodemon tự reload).

**Terminal 2 – Frontend:**
```bash
cd client
npm start
```

Đợi mở trình duyệt: **http://localhost:3000**.

---

## 3. Seed (lần đầu hoặc reset data)

```bash
npm run seed
```

Tài khoản mẫu: **ADMIN** / **123**, **SV001** / **123**, ...

---

## 4. Kiểm tra nhanh

| Kiểm tra              | Cách làm |
|-----------------------|----------|
| Backend sống          | Mở http://localhost:5000/health → thấy `{"status":"OK"}` |
| Frontend gọi API      | Đăng nhập (ADMIN hoặc SV001) |
| Socket kết nối        | Mở F12 → Console, thấy log `>>> [Socket] Đã kết nối thành công!` |
| Chat + Thu hồi        | Vào chat, gửi tin, bấm vào tin → Thu hồi → xác nhận |

---

## 5. Lỗi thường gặp

- **MongoDB Connection Error** → Bật MongoDB (service hoặc `mongod`).
- **Lỗi kết nối / CORS** → Đảm bảo backend chạy đúng port 5000 và chỉ mở frontend qua http://localhost:3000.
- **Socket không kết nối** → Kiểm tra backend đã start; F12 → Console xem lỗi Socket.
- **Bấm (Đăng nhập / nút khác) không thấy gì**:
  1. Đảm bảo đã chạy **Mục 0** (cài đặt lần đầu) ở cả thư mục gốc và `client`.
  2. Backend phải đang chạy: Terminal 1 chạy `npm start` tại thư mục gốc.
  3. Mở F12 → tab **Console**: nếu có lỗi đỏ (ví dụ `Cannot read property ... of undefined`) thì báo lỗi đó để xử lý.
  4. Tab **Network**: bấm Đăng nhập xem có request tới `localhost:5000` không; nếu Failed (red) thì backend chưa chạy hoặc CORS/port sai.
