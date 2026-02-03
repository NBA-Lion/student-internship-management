# ✅ Checklist theo đề bài – Website Quản lý Sinh viên Thực tập

## I. CHỨC NĂNG DÀNH CHO SINH VIÊN

### 1. Đăng ký tài khoản / đăng nhập
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Đăng ký bằng email | ✅ | Register.jsx, API register |
| Đăng nhập / đăng xuất | ✅ | Login, logout |
| Quên mật khẩu (có thể mô phỏng) | ✅ | ForgotPassword → email link → ResetPassword (Ethereal test / trả link trong response dev) |

### 2. Quản lý hồ sơ cá nhân
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Họ và tên | ✅ | Profile-form, User.full_name |
| Ngày sinh | ✅ | Profile-form date_of_birth, User.dob |
| Trường / khoa / ngành | ✅ | university, faculty, major |
| MSSV | ✅ | student_code (hiển thị, có thể chỉ đọc) |
| Số điện thoại | ✅ | phone |
| Email | ✅ | email |
| Thời gian thực tập (từ ngày – đến ngày) | ✅ | start_date, end_date (InternshipTabs + Profile) |
| Đơn vị / phòng ban thực tập | ✅ | internship_unit |

### 3. Đăng ký thực tập
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Chọn đợt thực tập | ✅ | InternshipTabs, API periods |
| Nhập đề tài thực tập (mô tả ngắn) | ✅ | internship_topic |
| Upload: CV (PDF) | ✅ | Upload CV, cv_url |
| Upload: Giấy giới thiệu (nếu có) | ✅ | recommendation_letter_url |
| Trạng thái: Chờ duyệt / Đã duyệt / Từ chối | ✅ | internship_status, hiển thị trong InternshipTabs |

### 4. Theo dõi kết quả thực tập
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Xem: Người hướng dẫn | ✅ | mentor_name, mentor_email, mentor_phone (Home, InternshipTabs, Profile) |
| Xem: Nhận xét | ✅ | mentor_feedback |
| Xem: Điểm / đánh giá | ✅ | final_grade, report_score, final_status |
| Trạng thái hoàn thành thực tập | ✅ | Đã hoàn thành, final_status Đạt/Không đạt |

---

## II. CHỨC NĂNG DÀNH CHO ADMIN

### 1. Quản lý sinh viên
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Danh sách sinh viên | ✅ | AdminStudents.jsx, GET /api/admin/students |
| Tìm kiếm / lọc: Trường | ✅ | university filter |
| Tìm kiếm / lọc: Đợt thực tập | ✅ | period_id filter |
| Tìm kiếm / lọc: Trạng thái | ✅ | status filter |
| Xem chi tiết hồ sơ sinh viên | ✅ | Modal/ drawer chi tiết trong AdminStudents |

### 2. Duyệt đăng ký thực tập
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Xem hồ sơ + file đính kèm | ✅ | Chi tiết SV, link CV / thư giới thiệu |
| Duyệt / từ chối | ✅ | Nút Duyệt, Từ chối, API status |
| Ghi chú lý do từ chối | ✅ | admin_note trong modal Từ chối |

### 3. Phân công người hướng dẫn
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Gán cán bộ hướng dẫn cho sinh viên | ✅ | assignMentor, mentor_ref, danh sách mentors từ API |
| Mỗi cán bộ có thể hướng dẫn nhiều sinh viên | ✅ | Model/API hỗ trợ (mentor_ref), danh sách mentors |

### 4. Đánh giá – kết thúc thực tập
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Nhập nhận xét | ✅ | mentor_feedback (form sửa SV / đánh giá) |
| Chấm điểm (hoặc Đạt / Không đạt) | ✅ | final_grade, final_status (Đạt / Không đạt) |
| Xác nhận hoàn thành | ✅ | is_completed, final_status |

### 5. Thống kê – báo cáo (mức nâng cao)
| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Số sinh viên theo đợt | ✅ | Lọc theo đợt trên danh sách; stats tổng (total, pending, interning, completed) |
| Số sinh viên đã hoàn thành | ✅ | GET /api/admin/stats → completed, hiển thị Home (admin) |
| Xuất danh sách ra Excel / CSV | ✅ | Nút “Xuất CSV”, GET /api/admin/export/csv |

---

## III. YÊU CẦU GIAO DIỆN

| Yêu cầu | Trạng thái | Ghi chú |
|--------|------------|---------|
| Giao diện web đơn giản, rõ ràng | ✅ | Ant Design, layout rõ ràng |
| Có phân trang | ✅ | AdminStudents: pagination (pageSize 10, showSizeChanger) |
| Responsive cơ bản | ✅ | Ant Design Grid, Row/Col |
| Có trang Admin riêng | ✅ | /admin/students, PrivateRoute, Nav theo role |

---

## Kết luận

**Theo đúng đề bài: đã đủ các mục.**

- **Sinh viên:** Đăng ký/đăng nhập, quên mật khẩu (mô phỏng), hồ sơ cá nhân, đăng ký thực tập (đợt, đề tài, upload CV/giấy giới thiệu), trạng thái (Chờ duyệt / Đã duyệt / Từ chối), theo dõi kết quả (người hướng dẫn, nhận xét, điểm, hoàn thành).
- **Admin:** Danh sách SV, tìm/lọc (trường, đợt, trạng thái), xem chi tiết, duyệt/từ chối + ghi chú, phân công người hướng dẫn, đánh giá (nhận xét, điểm, Đạt/Không đạt, hoàn thành), thống kê (số SV, đã hoàn thành, theo đợt qua lọc), xuất CSV.
- **Giao diện:** Đơn giản, phân trang, responsive cơ bản, trang Admin riêng.

Nếu giáo viên yêu cầu thêm (vd: trang thống kê riêng “Số SV theo từng đợt” dạng bảng/biểu đồ), có thể bổ sung sau; với mức “nâng cao” trong đề thì phần hiện tại là đạt.

---

## Bổ sung gợi ý (từ cao đến thấp)

Các mục dưới **không bắt buộc** theo đề bài; nếu muốn nâng cấp hệ thống có thể làm thêm, xếp theo ưu tiên từ cao xuống thấp.

### Mức cao (ảnh hưởng lớn, nên làm trước)

| # | Bổ sung | Mô tả ngắn |
|---|--------|-------------|
| 1 | **Trang Thống kê riêng (Admin)** | Trang `/admin/statistics` với biểu đồ: số SV theo từng đợt, theo trạng thái, theo trường/ngành (Chart.js / Recharts). |
| 2 | **Thông báo khi duyệt/từ chối** | Admin duyệt/từ chối → gửi thông báo cho SV (in-app hoặc email) kèm nội dung/ghi chú. |
| 3 | **Gửi email thật khi Quên mật khẩu** | Production: cấu hình SMTP thật (Gmail, SendGrid…) thay Ethereal; ẩn link reset trong response khi không phải dev. |
| 4 | **Xác thực email khi đăng ký** | Sau đăng ký gửi link kích hoạt qua email; tài khoản chỉ dùng được sau khi verify. |

### Mức trung bình (hữu ích, làm khi có thời gian)

| # | Bổ sung | Mô tả ngắn |
|---|--------|-------------|
| 5 | **Lịch sử thay đổi trạng thái (audit log)** | Lưu: ai duyệt/từ chối, lúc nào, ghi chú. Hiển thị trong chi tiết SV hoặc trang log Admin. |
| 6 | **Template Import chuẩn** | Nút "Tải mẫu Excel/CSV" theo đúng cột hệ thống trên trang Import. |
| 7 | **Tìm kiếm nâng cao** | Tìm theo đề tài, đơn vị thực tập, tên người hướng dẫn (ngoài tên, MSSV, email). |
| 8 | **Phân quyền Giảng viên (lecturer)** | Trang riêng cho lecturer: xem SV được gán, nhập nhận xét/điểm (tùy quy định). |
| 9 | **Responsive sâu hơn** | Menu mobile (drawer/hamburger), bảng Admin thu gọn trên điện thoại. |

### Mức thấp (tùy chọn, làm sau cùng)

| # | Bổ sung | Mô tả ngắn |
|---|--------|-------------|
| 10 | **Dashboard sinh viên** | Trang tổng quan: tiến độ hồ sơ, deadline, link nhanh (Profile, Đăng ký, Kết quả). |
| 11 | **Lịch / Deadline** | Hiển thị lịch đợt thực tập, hạn nộp, ngày kết thúc đợt. |
| 12 | **In / Xuất PDF** | In phiếu đăng ký, phiếu đánh giá (PDF). |
| 13 | **Dark mode** | Tùy chọn giao diện tối (CSS biến, lưu preference). |
| 14 | **Đa ngôn ngữ (i18n)** | Chuyển Tiếng Việt / Tiếng Anh. |
| 15 | **Backup / Export toàn bộ** | Admin export toàn bộ dữ liệu (JSON/CSV) hoặc backup định kỳ. |

**Tóm tắt:** Ưu tiên cao: **Trang Thống kê** + **Thông báo duyệt/từ chối**; tiếp theo **email thật (quên mật khẩu)** và **xác thực email đăng ký**. Các mục trung bình và thấp làm dần khi có thời gian.
