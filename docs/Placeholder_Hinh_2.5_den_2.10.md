# Placeholder hình Chương 2 (Hình 2.5 – 2.10)

*Copy từng khối dưới đây vào đúng vị trí trong báo cáo (Word hoặc file .md). Có thể dùng draw.io hoặc StarUML để vẽ các sơ đồ, sau đó export ảnh PNG/SVG và chèn thay cho dòng placeholder.*

---

**[ Ông chèn hình ảnh Sơ đồ kiến trúc Client-Server-Database vào đây ]**

**Hình 2.5:** Sơ đồ kiến trúc tổng thể của hệ thống.

---

**[ Ông chèn hình ảnh Flowchart Luồng Đăng nhập vào đây ]**

**Hình 2.6:** Lưu đồ thuật toán chức năng Đăng nhập và Phân quyền.

---

**[ Ông chèn hình ảnh Flowchart Luồng Admin vào đây ]**

**Hình 2.7:** Lưu đồ luồng xử lý nghiệp vụ của Quản trị viên.

---

**[ Ông chèn hình ảnh Flowchart Luồng Sinh viên vào đây ]**

**Hình 2.8:** Lưu đồ luồng xử lý nghiệp vụ của Sinh viên.

---

**[ Ông chèn hình ảnh Flowchart Luồng HR/Mentor vào đây ]**

**Hình 2.9:** Lưu đồ luồng xử lý nghiệp vụ của Cán bộ doanh nghiệp.

---

**[ Ông chèn hình ảnh Sơ đồ quan hệ Database - các Collection vào đây ]**

**Hình 2.10:** Sơ đồ thiết kế các Collection trong cơ sở dữ liệu MongoDB.

---

**Gợi ý công cụ vẽ:**
- **draw.io** (https://draw.io): mở file `So_do_Chuong_2.drawio` trong thư mục này (đã có sẵn Hình 2.5 và 2.6), chỉnh sửa rồi export PNG/SVG. Hoặc copy mã Mermaid bên dưới vào mermaid.live → export ảnh → trong draw.io chọn Insert → Image để chèn ảnh vào.
- **StarUML**: vẽ flowchart, Use Case; export ảnh.
- **Mermaid** (https://mermaid.live): dán từng khối code bên dưới → Export PNG/SVG → dùng ảnh trong Word hoặc chèn vào draw.io làm nền để vẽ lại.

---

## Mã Mermaid – copy vào mermaid.live rồi export ảnh, sau đó chèn ảnh vào draw.io (Insert → Image)

### Hình 2.5 – Kiến trúc Client-Server-Database

```mermaid
flowchart LR
    Client["Client (React SPA)"]
    Server["Server (Node.js + Express)"]
    DB[(MongoDB)]
    Client -->|"HTTP / API"| Server
    Server -->|Mongoose| DB
```

### Hình 2.6 – Đăng nhập và Phân quyền

```mermaid
flowchart TD
    Start([START]) --> Login[Nhập username và password]
    Login --> Auth{Xác thực?}
    Auth -->|Sai| Login
    Auth -->|Đúng| Role{Kiểm tra Role}
    Role -->|Admin| A[Vào Dashboard Admin]
    Role -->|Sinh viên| S[Vào Dashboard Sinh viên]
    Role -->|HR / Mentor| H[Vào Dashboard Cán bộ DN]
    A --> End([END])
    S --> End
    H --> End
```

### Hình 2.7 – Luồng Quản trị viên

```mermaid
flowchart TD
    Start([START]) --> A1[Xem Dashboard và Thống kê]
    A1 --> A2{Chọn thao tác}
    A2 -->|Quản lý SV| A3[Xem danh sách sinh viên]
    A3 --> A4{Xét duyệt hồ sơ}
    A4 -->|Duyệt| A5[Trạng thái Đang TT]
    A4 -->|Từ chối| A6[Từ chối, thêm ghi chú]
    A5 --> A7[Lưu DB]
    A6 --> A7
    A2 -->|Quản lý DN & HR| A8[CRUD Doanh nghiệp / HR]
    A8 --> A7
    A2 -->|Import| A9[Tải Excel/CSV]
    A9 --> A10{Hợp lệ?}
    A10 -->|Có| A11[Ghi DB]
    A10 -->|Không| A12[Báo lỗi]
    A11 --> A7
    A7 --> A13{Tiếp tục?}
    A13 -->|Có| A2
    A13 -->|Đăng xuất| End([END])
```

### Hình 2.8 – Luồng Sinh viên

```mermaid
flowchart TD
    Start([START]) --> S1[Đăng ký thực tập]
    S1 --> S2[Tải CV và thư giới thiệu]
    S2 --> S3[Lưu DB]
    S3 --> S4[Chờ Admin duyệt]
    S4 --> S5{Trạng thái?}
    S5 -->|Chờ| S4
    S5 -->|Từ chối| S6[Sửa và nộp lại]
    S6 --> S2
    S5 -->|Duyệt| S7[Chat với HR/Mentor]
    S7 --> S8{Hoàn thành TT?}
    S8 -->|Chưa| S7
    S8 -->|Có| S9[Xem kết quả đánh giá]
    S9 --> End([END])
```

### Hình 2.9 – Luồng Cán bộ doanh nghiệp (HR/Mentor)

```mermaid
flowchart TD
    Start([START]) --> H1[Xem danh sách SV công ty]
    H1 --> H2{Chọn thao tác}
    H2 -->|Gán Mentor| H3[Gán mentor cho SV]
    H3 --> H4[Lưu DB]
    H2 -->|Đánh giá| H5[Nhập điểm và nhận xét]
    H5 --> H6{Điểm hợp lệ?}
    H6 -->|Không| H5
    H6 -->|Có| H7[Lưu đánh giá]
    H2 -->|Chat| H8[Chat với SV / Admin]
    H4 --> H9{Tiếp tục?}
    H7 --> H9
    H8 --> H9
    H9 -->|Có| H2
    H9 -->|Đăng xuất| End([END])
```

### Hình 2.10 – Sơ đồ các Collection MongoDB

```mermaid
erDiagram
    Users {
        ObjectId _id PK
        String student_code UK
        String role
        ObjectId company_id FK
        ObjectId mentor_id FK
        ObjectId internship_period_id FK
    }
    Companies {
        ObjectId _id PK
        String name UK
        String address
        Boolean is_active
    }
    InternshipPeriods {
        ObjectId _id PK
        String code UK
        String name
        Date startDate
        Date endDate
    }
    Messages {
        ObjectId _id PK
        String sender
        String receiver
        String message
    }
    ActivityLogs {
        ObjectId _id PK
        String type
        ObjectId user_id FK
    }
    Users }o--|| Companies : "company_id"
    Users }o--o| Users : "mentor_id"
    Users }o--o| InternshipPeriods : "internship_period_id"
    Messages }o--|| Users : "sender"
    Messages }o--|| Users : "receiver"
    ActivityLogs }o--|| Users : "user_id"
```
