# 📚 Tài liệu dự án

Hệ thống Quản lý Sinh viên Thực tập — hướng dẫn cài đặt, chạy và deploy.

---

## Mục lục

| # | File | Nội dung |
|---|------|----------|
| 1 | [01-cai-dat.md](./01-cai-dat.md) | Yêu cầu hệ thống, clone, cài đặt, MongoDB |
| 2 | [02-chay-ung-dung.md](./02-chay-ung-dung.md) | Chạy app, seed, tài khoản mặc định |
| 3 | [03-cau-truc-api.md](./03-cau-truc-api.md) | Cấu trúc thư mục, API endpoints |
| 4 | [04-troubleshooting.md](./04-troubleshooting.md) | Xử lý lỗi (local + deploy) |
| 5 | [05-deploy.md](./05-deploy.md) | Deploy lên Render + Vercel |
| 6 | [06-recaptcha.md](./06-recaptcha.md) | Cấu hình reCAPTCHA (key thật, từng bước) |
| — | [checklist.md](./checklist.md) | Checklist đề bài |
| — | [refactoring.md](./refactoring.md) | Tóm tắt refactoring |
| — | [import/](./import/) | Hướng dẫn import (đợt, SV, mẫu CSV) |

---

## Quick Start

```bash
npm install
cd client && npm install && cd ..
npm run seed
npm start          # Terminal 1
cd client && npm start   # Terminal 2
```

Đăng nhập: **ADMIN** / **123**
