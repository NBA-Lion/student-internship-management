# 🎓 Hệ thống Quản lý Sinh viên Thực tập

Hệ thống quản lý thực tập với các tính năng: quản lý sinh viên, import Excel, chat real-time, theo dõi hồ sơ, đánh giá kết quả.

---

## Quick Start (local)

```bash
# 1. Cài dependency
npm install
cd client && npm install && cd ..

# 2. (Tuỳ chọn) Seed dữ liệu mẫu
npm run seed

# 3. Chạy backend + frontend (2 terminal)
npm start                 # Terminal 1: Backend (http://localhost:5000)
cd client && npm start    # Terminal 2: Frontend (http://localhost:3000)
```

- **Tài khoản mẫu:** xem chi tiết trong `docs/02-chay-ung-dung.md`.
- Có thể dùng **db-dump** thật trong `db-dump/intern_system_v2/` thay cho seed (xem mục “Khôi phục dữ liệu MongoDB” trong docs).

---

## 📚 Tài liệu

Toàn bộ hướng dẫn nằm trong thư mục **[docs/](./docs/)**:

| File | Nội dung |
|------|----------|
| [docs/README.md](./docs/README.md) | Mục lục đầy đủ |
| [docs/01-cai-dat.md](./docs/01-cai-dat.md) | Cài đặt |
| [docs/02-chay-ung-dung.md](./docs/02-chay-ung-dung.md) | Chạy app, seed |
| [docs/03-cau-truc-api.md](./docs/03-cau-truc-api.md) | Cấu trúc, API |
| [docs/04-troubleshooting.md](./docs/04-troubleshooting.md) | Xử lý lỗi |
| [docs/05-deploy.md](./docs/05-deploy.md) | Deploy Vercel + Render |
| [docs/06-recaptcha.md](./docs/06-recaptcha.md) | Cấu hình Google reCAPTCHA v2 |

---

## Tech Stack

- **Backend:** Node.js, Express, MongoDB, Socket.IO
- **Frontend:** React 17, Recoil, Ant Design, Material-UI
