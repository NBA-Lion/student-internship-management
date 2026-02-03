## Triển khai sản phẩm (MongoDB Atlas + Render + Vercel)

### 1. Backend (Render)

**Trong form tạo Web Service trên Render, điền hợp lý như sau:**

| Ô | Giá trị hợp lý |
|---|----------------|
| **Source Code** | GitHub repo của bạn (vd: `NBA-Lion/student-internship-management`) |
| **Name** | `student-internship-management` (hoặc tên bạn muốn) |
| **Language** | `Node` |
| **Branch** | `main` |
| **Region** | Singapore (Southeast Asia) hoặc gần user nhất |
| **Root Directory** | Để trống (backend nằm ở root repo) |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

**Biến môi trường (Environment):**
- `MONGODB_URI` = connection string từ MongoDB Atlas.
- `FRONTEND_URL` = URL frontend Vercel (vd: `https://xxx.vercel.app`) — thêm sau khi deploy frontend, để CORS/socket hoạt động.

### 2. Frontend (Vercel) — từ đầu đến cuối

**Bước 1 — Trang "Let's build something new":**
- Nếu chưa kết nối GitHub: bấm **Install** (GitHub) để cài Vercel cho tài khoản/org GitHub của bạn, rồi chọn namespace (user hoặc org).
- Chọn repo **student-internship-management** (Import Git Repository). Hoặc dán URL repo vào ô "Enter a Git repository URL to deploy..." rồi bấm **Continue**.

**Bước 2 — Configure Project:**
- **Framework Preset:** để Vercel tự nhận (Create React App) hoặc chọn **Create React App**.
- **Root Directory:** bấm **Edit** → điền `client` (frontend nằm trong thư mục `client`).
- **Build Command:** `npm run build` (mặc định thường đã đúng).
- **Output Directory:** `build` (mặc định với CRA).
- **Install Command:** để mặc định `npm install`.

**Bước 3 — Environment Variables:**
- Thêm biến:
  - **Name:** `REACT_APP_BACKEND_URL`  
  - **Value:** URL backend Render (vd: `https://student-internship-management.onrender.com`).
- (Nếu build báo lỗi OpenSSL) thêm: `NODE_OPTIONS` = `--openssl-legacy-provider`.

**Bước 4 — Deploy:**
- Bấm **Deploy**. Đợi build và deploy xong.
- Vercel sẽ cho URL dạng `https://...vercel.app` — đây là link frontend, gửi cho bạn bè dùng.

**Bước 5 — Cập nhật Backend (Render):**
- Vào Render → service backend → **Environment** → thêm/sửa:
  - `FRONTEND_URL` = URL Vercel vừa có (vd: `https://xxx.vercel.app`).
- Save. Render sẽ redeploy để CORS và socket chấp nhận domain Vercel.

### 3. Local dev (không đổi)
- Ở máy bạn vẫn chạy `npm start` (backend) và `cd client && npm start` (frontend).
- Mặc định frontend dùng `http://localhost:5000` nếu không có `REACT_APP_BACKEND_URL`, nên code cũ vẫn hoạt động.
