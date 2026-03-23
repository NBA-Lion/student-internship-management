# Triển khai Nginx trên Windows (172.16.251.51 — pmqltt.lcit.vn)

Mục tiêu: người dùng mở `http://pmqltt.lcit.vn` (sau này `https://`) — Nginx listen **80/443**, proxy nội bộ sang **3000** (React) và **5000** (API + Socket.IO).

## 1. Trên server (trước khi cài Nginx)

- PM2: **frontend** port **3000**, **backend** port **5000** đang **online**.
- File cấu hình mẫu: [nginx-pmqltt.conf](./nginx-pmqltt.conf).

## 2. Cài Nginx cho Windows

1. Tải bản Windows tại [nginx.org/en/download.html](https://nginx.org/en/download.html) (Stable).
2. Giải nén ví dụ `C:\nginx`.
3. **Cách dễ nhất:** backup `C:\nginx\conf\nginx.conf`, rồi thay toàn bộ bằng file mẫu đã gộp sẵn: [nginx.conf.windows-merged.example](./nginx.conf.windows-merged.example) (copy nội dung vào `nginx.conf`).

   **Hoặc** giữ file gốc: trong block `http { ... }`, thêm khối `map` (từ `nginx-pmqltt.conf`) ngay sau `keepalive_timeout`, và **xóa nguyên** `server { listen 80; server_name localhost; ... }` mặc định, thay bằng toàn bộ `server { ... }` trong `nginx-pmqltt.conf`.

   **Hoặc** dùng `include` trong `http { ... }`:

```nginx
include C:/nginx/conf/sites/pmqltt.conf;
```

(Lưu ý đường dẫn Windows trong nginx dùng `/` hoặc `\\`.)

4. Trong `nginx.conf` gốc, đảm bảo có block `http { ... }` và không trùng `server` listen 80 cũ — chỉ giữ một cấu hình `server` cho pmqltt hoặc gộp `server_name`.

5. Kiểm tra cú pháp:

```bat
cd C:\nginx
nginx -t
```

6. Chạy / reload:

```bat
start nginx
nginx -s reload
```

(Nếu chạy lần đầu: `nginx.exe` trong thư mục `C:\nginx`.)

## 3. Windows Firewall

Trên **172.16.251.51**, mở **Inbound**:

- **TCP 80** (HTTP)
- **TCP 443** (khi đã bật HTTPS)

PowerShell (Administrator):

```powershell
New-NetFirewallRule -DisplayName "Nginx HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Nginx HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

## 4. Sophos / NAT

- Forward từ public **14.225.69.226** (hoặc WAN rule tương ứng):
  - **80 → 172.16.251.51:80**
  - **443 → 172.16.251.51:443** (khi đã có SSL)

(Không forward thẳng WAN:80 → :3000 nữa nếu đã dùng Nginx trên :80 — tránh trùng ý đồ.)

## 5. Biến môi trường app

**Backend** (`.env` trên server):

```env
FRONTEND_URL=http://pmqltt.lcit.vn,https://pmqltt.lcit.vn
```

(Sau khi có HTTPS chỉ cần `https://...` nếu chỉ cho phép HTTPS.)

**Frontend** (`client/.env` lúc **build**):

- Cách đơn giản khi mọi API qua cùng domain: để API gọi **relative** (cùng origin), ví dụ base URL rỗng hoặc `http://pmqltt.lcit.vn` / `https://pmqltt.lcit.vn` khớp cách user truy cập.

Sau khi đổi `.env` client: `npm run build` lại và restart PM2 frontend.

## 6. HTTPS (sau bước HTTP ổn định)

1. Có file cert + key (Let’s Encrypt, hoặc cert nội bộ do IT cấp).
2. Bỏ comment các dòng `listen 443 ssl` và `ssl_certificate` trong `nginx-pmqltt.conf`.
3. `nginx -t` rồi `nginx -s reload`.

## 7. Kiểm tra nhanh

Trên server:

```bat
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/api/routes
```

(Production có thể ẩn `/api/routes` — dùng `curl http://127.0.0.1/health` thay thế.)

`netstat -ano | findstr ":80"` phải thấy **LISTENING** (nginx).

## 8. Xử lý sự cố

| Hiện tượng | Hướng xử lý |
|------------|-------------|
| `nginx: bind() to 0.0.0.0:80 failed` | IIS hoặc app khác đã chiếm 80 — tắt hoặc đổi port. |
| 502 Bad Gateway | PM2 không chạy :3000 / :5000 hoặc sai port trong `proxy_pass`. |
| Vào được web nhưng login lỗi | Kiểm tra `FRONTEND_URL`, CORS, và `REACT_APP_*` trong bản build. |
| Chat/socket lỗi | Kiểm tra location `/socket.io/` và firewall. |
| **“Nhận được HTML thay vì JSON”** / `/api/` trả trang React | **Host** trình duyệt (vd `pmqltt.kit.vn`, **`pmqltt.vn`**, `www.pmqltt.vn`) **phải có trong** `server_name` của block `server` đang có `location /api/`. Nếu thiếu, Nginx dùng **server mặc định** khác → chỉ có `location /` → proxy hết sang :3000 → API trả `index.html`. Sửa: thêm domain vào `server_name`, `nginx -t`, `nginx -s reload`. Đồng bộ `REACT_APP_BACKEND_URL` / `client/.env` với **đúng domain** user mở. |

### Kiểm tra nhanh API qua đúng Host (trên server)

```bat
curl -s -X POST "http://127.0.0.1/api/auth/login" -H "Host: TEN_DOMAIN_CUA_BAN" -H "Content-Type: application/json" -d "{\"student_code\":\"ADMIN\",\"password\":\"123\"}"
```

Nếu dòng đầu body là `{` (JSON): OK. Nếu ra `<!DOCTYPE` hoặc `<html`: Nginx chưa khớp `server_name` với `Host` đó hoặc thiếu `location /api/`.

---

**Tóm lại:** Triển khai = cài Nginx trên **172.16.251.51** + dán config mẫu + mở firewall 80/443 + NAT trỏ vào **:80/:443** của server + cập nhật `FRONTEND_URL` và rebuild client nếu cần.
