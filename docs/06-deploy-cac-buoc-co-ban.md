# Các bước deploy (tóm tắt)

Chi tiết Cloud: [05-deploy.md](05-deploy.md).

---

## Cloud (Render + Vercel + Atlas)

1. Atlas: tạo cluster, lấy connection string.
2. Render: Web Service từ repo; env: `MONGODB_URI`, `FRONTEND_URL`, `SERVER_URL`.
3. Vercel: root = `client`, build = `npm run build`; env: `REACT_APP_BACKEND_URL` = URL Render.
4. Render → cập nhật `FRONTEND_URL` = URL Vercel.
5. Seed DB với `MONGODB_URI` production.

---

## Server Windows nội bộ (vd: 172.16.251.51)

VM hay máy thật đều được; cài Node.js LTS không vấn đề (dùng port 3000, 5000). Có thể đăng nhập server bằng **SSH** thay RDP; clone repo dùng **SSH** hoặc HTTPS đều được.

1. Cài **Node.js LTS** + **Git**; (tùy chọn) MongoDB local hoặc Atlas.
2. **Clone** (vd. SSH): `git clone git@github.com:NBA-Lion/student-internship-management.git` → vào thư mục → tạo `.env` (PORT, MONGODB_URI, FRONTEND_URL). Không commit `.env`.
3. **Build:** Set `REACT_APP_BACKEND_URL=http://<IP-server>:5000` trước khi build (để thiết bị khác đăng nhập được). Rồi: `npm install` → `cd client` → `npm install` → `npm run build` → `cd ..`
4. **Chạy nền:** `npm install -g pm2 serve` → `pm2 start serve --name "frontend" -- client/build -l 3000` → `pm2 start server.js --name "backend"`
5. Firewall: mở 3000, 5000 nếu cần. Seed: `$env:MONGODB_URI="..."; npm run seed`

Truy cập: `http://<IP>:3000` (web), `:5000` (API). Đăng nhập từ thiết bị khác (cùng mạng) dùng bình thường nếu đã build đúng `REACT_APP_BACKEND_URL` và mở firewall.
