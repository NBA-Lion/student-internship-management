## Triển khai sản phẩm (MongoDB Atlas + Render + Vercel)

### 1. Backend
- Tạo MongoDB Atlas, lấy connection string và đặt vào biến môi trường `MONGODB_URI` trên Render.
- Deploy backend lên Render từ repo GitHub này, `Build: npm install`, `Start: npm start`.
- Trên Render đặt thêm `FRONTEND_URL` = URL Vercel (sau bước 2) để CORS/socket cho phép.

### 2. Frontend
- Trong Vercel, tạo project trỏ vào thư mục `client` của repo.
- Thiết lập build: `npm run build`, output: `build`.
- Thêm biến môi trường `REACT_APP_BACKEND_URL` = URL backend Render (ví dụ `https://your-backend.onrender.com`). 
- Deploy, Vercel sẽ trả về URL dạng `https://...vercel.app` – gửi link này cho bạn bè.

### 3. Local dev (không đổi)
- Ở máy bạn vẫn chạy `npm start` (backend) và `cd client && npm start` (frontend).
- Mặc định frontend dùng `http://localhost:5000` nếu không có `REACT_APP_BACKEND_URL`, nên code cũ vẫn hoạt động.
