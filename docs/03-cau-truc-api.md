# Cấu trúc & API

## Cấu trúc thư mục

```
Test/
├── client/                 # Frontend (React)
│   ├── public/
│   ├── src/
│   │   ├── _components/    # Shared components
│   │   ├── _helpers/       # Utilities
│   │   ├── account/        # Login/Register
│   │   ├── admin/          # Admin pages
│   │   └── App.jsx
│   └── package.json
├── config/                 # Database config
├── middleware/             # Express middlewares
├── models/                 # Mongoose schemas
├── routes/                 # API routes
├── scripts/                # Seed, reset-password, ...
├── server.js
└── docs/                   # Tài liệu
```

## API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký |

### User
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/user/profile/me` | Lấy profile |
| POST | `/api/user/profile/:id` | Cập nhật profile |
| PUT | `/api/user/internship-registration` | Đăng ký thực tập |

### Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin/students` | Danh sách sinh viên |
| PUT | `/api/user/:id/status` | Duyệt/từ chối hồ sơ |
| PUT | `/api/user/:id/evaluation` | Đánh giá kết quả |

### Import (Excel)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/import/users?role=student` | Import sinh viên |
| POST | `/api/import/users?role=lecturer` | Import giảng viên |
| POST | `/api/import/companies` | Import doanh nghiệp |
| POST | `/api/import/batches` | Import đợt thực tập |
| POST | `/api/import/grades` | Import kết quả |
| POST | `/api/import/status` | Import trạng thái |
