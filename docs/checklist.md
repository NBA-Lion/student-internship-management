# ![Uploading image.png…]()
 Checklist theo đề bài – Website Quản lý Sinh viên Thực tập

## I. CHỨC NĂNG DÀNH CHO SINH VIÊN

### 1. Đăng ký tài khoản / đăng nhập
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Đăng ký bằng email | ✅ | Register.jsx, API register |
| Đăng nhập / đăng xuất | ✅ | Login, logout |
| Quên mật khẩu (có thể mô phỏng) | ✅ | ForgotPassword → email link → ResetPassword |

### 2. Quản lý hồ sơ cá nhân
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Họ và tên, Ngày sinh, Trường/khoa/ngành | ✅ | Profile-form |
| MSSV, Số điện thoại, Email | ✅ | User model |
| Thời gian thực tập, Đơn vị thực tập | ✅ | start_date, end_date, internship_unit |

### 3. Đăng ký thực tập
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Chọn đợt, Nhập đề tài | ✅ | InternshipTabs, API periods |
| Upload CV, Giấy giới thiệu | ✅ | cv_url, recommendation_letter_url |
| Trạng thái: Chờ duyệt / Đã duyệt / Từ chối | ✅ | internship_status |

### 4. Theo dõi kết quả
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Người hướng dẫn, Nhận xét, Điểm | ✅ | mentor_name, mentor_feedback, final_grade |

---

## II. CHỨC NĂNG DÀNH CHO ADMIN

| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Danh sách SV, tìm/lọc | ✅ | AdminStudents.jsx |
| Duyệt/từ chối, ghi chú | ✅ | API status, admin_note |
| Phân công người hướng dẫn | ✅ | mentor_ref |
| Đánh giá, chấm điểm | ✅ | final_grade, final_status |
| Thống kê, Xuất CSV | ✅ | GET /api/admin/stats, /export/csv |

---

## III. YÊU CẦU GIAO DIỆN

| Yêu cầu | Trạng thái |
|--------|------------|
| Giao diện đơn giản, rõ ràng | ✅ |
| Có phân trang | ✅ |
| Responsive cơ bản | ✅ |
| Trang Admin riêng | ✅ |

---

*Xem file gốc đầy đủ trong lịch sử git.*
