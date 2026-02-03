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
> ⚠️ **Bắt buộc:** Từ bản cập nhật này, mọi request từ frontend sẽ tự động gắn `REACT_APP_BACKEND_URL`. Nếu quên biến này, đăng nhập sẽ gọi nhầm sang Vercel (trả HTML) → lỗi `Unexpected token '<'` hoặc “Đăng nhập thất bại”.

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

### 4. Cảnh báo khi build (Vercel) — giải thích và xử lý

Các cảnh báo dưới đây **không phải lỗi**: build vẫn thành công, app chạy bình thường. Chúng đến từ **Create React App (react-scripts)** và dependency bên trong, không phải từ code của bạn.

| Cảnh báo | Giải thích ngắn | Cách xử lý (tùy chọn) |
|----------|-----------------|------------------------|
| **DEP0176: fs.F_OK is deprecated** | Node.js khuyến nghị dùng `fs.constants.F_OK` thay vì `fs.F_OK`. Cảnh báo này do **webpack/react-scripts** (bên trong CRA) gọi, không phải code dự án. | Muốn ẩn: trên Vercel thêm env **NODE_OPTIONS** = `--openssl-legacy-provider --no-deprecation` (nếu đã dùng `--openssl-legacy-provider` thì thành `--openssl-legacy-provider --no-deprecation`). |
| **@humanwhocodes/object-schema deprecated** | Gói cũ của ESLint; nên chuyển sang `@eslint/object-schema`. | Bỏ qua; chỉ hết khi nâng cấp ESLint/CRA. |
| **@babel/plugin-proposal-xxx deprecated** | Các proposal Babel (private-methods, optional-chaining, class-properties, …) đã vào chuẩn ES, nên dùng `@babel/plugin-transform-xxx`. CRA 5 vẫn kéo bản cũ. | Chỉ hết hẳn khi nâng cấp khỏi CRA (vd: chuyển sang Vite) hoặc khi CRA cập nhật. Tạm thời có thể bỏ qua. |
| **source-map@0.8.0-beta.0 deprecated** | Phiên bản beta cũ của `source-map` (dependency của react-scripts). | Bỏ qua cho đến khi nâng cấp toolchain. |
| **svgo@1.3.2 deprecated** | SVGO 1.x không còn được hỗ trợ; nên dùng SVGO 2.x. CRA 5 dùng bản 1.x. | Bỏ qua hoặc nâng cấp khỏi CRA. |
| **eslint@8.57.1 no longer supported** | ESLint 8 hết hỗ trợ; nên dùng ESLint 9+. CRA 5 vẫn dùng ESLint 8. | Bỏ qua hoặc sau này chuyển build sang Vite/ESLint 9. |

**Tóm tắt:** Không cần sửa gì để deploy thành công. 
---

### 5. Xử lý màn hình trắng / đen sau khi deploy (3 nguyên nhân phổ biến)

#### 1. Thiếu cấu hình React Router trên Vercel (quan trọng)

React Router có các route như `/account/login`, `/admin/students`, … Khi user truy cập trực tiếp hoặc F5 trên đường dẫn con, Vercel cần gửi về `index.html` thay vì trả 404.

**Đã thêm:** Trong repo đã có file **`client/vercel.json`** với nội dung:

```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

Cấu hình này cho phép Vercel phục vụ file tĩnh (JS/CSS) trước, chỉ những route không khớp file mới rơi vào `index.html` (tránh lỗi `Unexpected token '<'`). Sau khi pull/merge, chỉ cần **git push** — Vercel sẽ build lại và áp dụng rewrites.

---

#### 2. Lỗi CORS trên Backend (Render)

Nếu backend không cho phép domain Vercel, trình duyệt sẽ chặn request → API không trả dữ liệu, app có thể trắng/đen hoặc treo.

**Cách kiểm tra:** Trên trang bị lỗi, nhấn **F12** → tab **Console**. Nếu thấy dòng đỏ có chữ **"CORS"** hoặc **"blocked by CORS policy"** thì đúng là lỗi CORS.

**Cách sửa:**
- Vào **Render** → service backend → **Environment** → chỉnh **FRONTEND_URL**:
  - Nên đặt đúng URL production: `https://student-internship-management.vercel.app`
  - Nếu có thêm domain preview (URL dài của Vercel), có thể đặt nhiều URL cách nhau bằng dấu phẩy, ví dụ:  
    `https://student-internship-management.vercel.app,https://student-internship-management-git-main-xxx.vercel.app`
- Đảm bảo **Vercel** đã có **REACT_APP_BACKEND_URL** đúng URL backend; frontend sẽ luôn gọi tới URL này (không còn dùng relative path).
- **Save** → Render sẽ redeploy. Sau đó thử lại frontend.

Backend đã hỗ trợ nhiều origin: mỗi URL trong `FRONTEND_URL` (cách nhau bởi dấu phẩy) đều được chấp nhận.

---

#### 3. Lỗi JavaScript trong Console

Màn hình trắng/đen thường kèm lỗi chạy code (sai biến môi trường, lỗi component, …).

**Cách kiểm tra:** **F12** → tab **Console** → xem các dòng **đỏ** (error). Chụp ảnh hoặc copy nội dung gửi người hỗ trợ để chỉ đúng file và dòng lỗi.

**Một khả năng hay gặp:** Biến môi trường chưa được nhận khi build. Trên Vercel, biến như **REACT_APP_BACKEND_URL** chỉ có khi **build**, không đổi khi chỉ "Redeploy" không rebuild. Nếu bạn vừa thêm/sửa env:
- Vào **Vercel** → **Deployments** → bấm **Redeploy** (để build lại) để chắc chắn bản mới build với env mới.
- Kiểm tra **Settings → Environment Variables** đã có **REACT_APP_BACKEND_URL** = URL backend Render (vd: `https://student-internship-management.onrender.com`). Nếu muốn log build “sạch” hơn: thử thêm **NODE_OPTIONS** = `--no-deprecation` (cùng với `--openssl-legacy-provider` nếu đang dùng) trong Environment Variables của Vercel; các cảnh báo npm deprecated sẽ chỉ hết khi đổi sang toolchain mới (vd. Vite).
