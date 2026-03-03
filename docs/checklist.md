# ✅ Checklist theo đề bài – Website Quản lý Sinh viên Thực tập

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

## II. BA VAI TRÒ RIÊNG (sát thực tế doanh nghiệp)

### 1. Admin / Giáo vụ (Nhà trường)
- **Nhiệm vụ:** Gom SV đủ điều kiện, tạo đợt thực tập, gửi danh sách (xem qua hệ thống).
- **Quyền:** Chỉ **XEM** kết quả cuối cùng (nhận xét, điểm). Cập nhật **trạng thái duyệt** (Chờ duyệt / Đang thực tập / Đã hoàn thành / Từ chối) và **ghi chú**. **Không** có nút sửa điểm, **không** phân công cán bộ hướng dẫn.

### 2. Quản lý Doanh nghiệp / HR (Công ty)
- **Nhiệm vụ:** Đăng nhập, tiếp nhận danh sách SV từ trường.
- **Quyền:** Thêm danh sách **Mentor** (tạo tài khoản role=mentor), **gán sinh viên cho Mentor** (phân công người hướng dẫn). Không đánh giá điểm.

### 3. Mentor (Người hướng dẫn trực tiếp)
- **Nhiệm vụ:** Đăng nhập, chỉ thấy **đúng danh sách SV được HR gán cho mình**.
- **Quyền:** **Nhập nhận xét**, **chấm điểm** (Đạt/Không đạt), **Xác nhận kết thúc**. Dữ liệu đẩy ngược cho Nhà trường xem.

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
