# Cấu hình reCAPTCHA (xác minh "Tôi không phải người máy")

Sau khi đăng nhập sai 3 lần, hệ thống yêu cầu hoàn thành reCAPTCHA. Mặc định đang dùng **test key** của Google (có dòng chữ đỏ "This reCAPTCHA is for testing purposes only..."). Để dùng key thật, làm theo các bước dưới.

---

## Bước 1: Đăng nhập Google reCAPTCHA Admin

1. Mở trình duyệt, vào: **https://www.google.com/recaptcha/admin**
2. Đăng nhập bằng tài khoản Google của bạn.

---

## Bước 2: Tạo site mới

1. Bấm nút **+** (hoặc "Create") để tạo site/project mới.
2. Điền **Label**: tên tùy ý (ví dụ: `QL Sinh viên Thực tập`).
3. Chọn **reCAPTCHA v2** → **"I'm not a robot" Checkbox**.
4. Ở mục **Domains** (rất quan trọng — sai domain sẽ báo "Invalid site key"):
   - Chạy thử trên máy: thêm **`localhost`** và **`127.0.0.1`** (mỗi cái một dòng). Nếu bạn mở trang bằng `http://127.0.0.1:3000` thì bắt buộc phải có `127.0.0.1`.
   - Đã deploy: thêm **tên miền thật** (ví dụ: `student-internship-management.vercel.app`).
   - Có thể thêm nhiều dòng (localhost, 127.0.0.1, tên miền deploy).
5. Chấp nhận điều khoản (nếu có), bấm **Submit**.

---

## Bước 3: Lấy Site Key và Secret Key

Sau khi tạo xong, Google hiển thị:

- **Site Key** (key công khai, dùng ở Frontend).
- **Secret Key** (key bí mật, chỉ dùng ở Backend).

Copy và giữ hai key này (có thể mở lại trang reCAPTCHA Admin để xem lại).

---

## Bước 4: Cấu hình trong project

### 4.1. Frontend (Site Key)

1. Vào thư mục **`client`**.
2. Tạo hoặc mở file **`.env`** hoặc **`.env.local`**.
3. Thêm (thay `YOUR_SITE_KEY` bằng Site Key của bạn):

```env
REACT_APP_RECAPTCHA_SITE_KEY=YOUR_SITE_KEY
```

4. Lưu file. **Restart** dev server frontend (`npm start` trong `client`) để đọc env mới.

### 4.2. Backend (Secret Key)

1. Ở **thư mục gốc** project (cùng cấp với `server.js`).
2. Tạo hoặc mở file **`.env`**.
3. Thêm (thay `YOUR_SECRET_KEY` bằng Secret Key của bạn):

```env
RECAPTCHA_SECRET_KEY=YOUR_SECRET_KEY
```

4. Lưu file. **Restart** server backend (`npm start` ở thư mục gốc).

---

## Bước 5: Kiểm tra

1. Mở trang đăng nhập.
2. Cố tình nhập **sai mật khẩu 3 lần**.
3. Lần thứ 4 sẽ hiện ô reCAPTCHA **"Tôi không phải người máy"**.
4. Tick vào ô → nếu cần, làm thử thách chọn ảnh → bấm **Đăng nhập** (với mật khẩu đúng).

- **Đúng**: Không còn dòng chữ đỏ "for testing purposes only", đăng nhập thành công sau khi hoàn thành reCAPTCHA.
- **Sai**: Kiểm tra lại Site Key / Secret Key, domain đã thêm trong reCAPTCHA Admin, và đã restart cả frontend lẫn backend sau khi sửa `.env`.

---

## Lưu ý

- **Không** commit file `.env` lên Git (đã có trong `.gitignore`).
- Deploy (Vercel, Render...): cấu hình **biến môi trường** tương ứng trên dashboard (Vercel: Settings → Environment Variables; Render: Environment).
- Nếu không cấu hình key thật, project vẫn dùng **test key** mặc định (widget hiện nhưng có dòng chữ đỏ và có thể báo lỗi xác minh).

---

## Lỗi "Invalid site key"

Nếu widget reCAPTCHA hiện chữ đỏ **"ERROR for site owner: Invalid site key"**:

1. **Domain chưa đúng**: Vào [reCAPTCHA Admin](https://www.google.com/recaptcha/admin) → chọn site của bạn → **Settings** (bút chì). Ở **Domains**:
   - Chỉ gõ **`localhost`** (một dòng, không có `http://`, không có cổng `:3000`).
   - Hoặc thêm thêm dòng **`127.0.0.1`** nếu bạn hay mở bằng địa chỉ đó.
   - Bấm **Save** và đợi vài phút cho Google cập nhật.
2. **Frontend chưa đọc .env**: Sau khi sửa `client/.env`, **tắt hẳn** `npm start` trong `client` (Ctrl+C) rồi chạy lại `npm start`. Create React App chỉ đọc biến env lúc khởi động.
3. **Hard refresh trình duyệt**: Thử Ctrl+Shift+R (hoặc Ctrl+F5) để tải lại trang không dùng cache. Hoặc mở tab ẩn danh và vào `http://localhost:3000/account/login`.
4. **Đúng loại key**: Site phải tạo **reCAPTCHA v2** → **"I'm not a robot" Checkbox**, không phải v3 hay loại khác.

**Copy key trực tiếp từ Google (tránh sai l/I, 0/O):** Vào [reCAPTCHA Admin](https://www.google.com/recaptcha/admin) → chọn site → bấm **COPY SITE KEY**, dán vào `client/.env` (dòng `REACT_APP_RECAPTCHA_SITE_KEY=...`). Làm tương tự **COPY SECRET KEY** → dán vào `.env` thư mục gốc (`RECAPTCHA_SECRET_KEY=...`). Không gõ tay.

**Kiểm tra Domain từng bước:**
- Vào reCAPTCHA Admin → chọn site **QL Sinh viên Thực tập** → bấm **Settings** (icon bút chì).
- Mục **Domains**: phải có **đúng 2 dòng**: dòng 1 là `localhost`, dòng 2 là `127.0.0.1` (không thêm http, không thêm :3000).
- Nếu thiếu hoặc sai → sửa → bấm **Save**. Đợi 1–2 phút rồi mới thử lại trang login.
- Trình duyệt đang mở `http://localhost:3000` thì domain dùng là `localhost`; nếu mở `http://127.0.0.1:3000` thì domain là `127.0.0.1`. Cần có ít nhất một trong hai trong danh sách Domains.

**Tạm thời dùng lại test key:** Nếu vẫn lỗi và bạn cần đăng nhập gấp, đổi tên biến trong `client/.env` (ví dụ thành `REACT_APP_RECAPTCHA_SITE_KEY_OLD=...`) hoặc xóa dòng đó, restart client → app sẽ dùng key test mặc định (widget chạy, có dòng chữ "for testing purposes only"). Sau khi sửa xong domain và key trong reCAPTCHA Admin, đổi lại thành `REACT_APP_RECAPTCHA_SITE_KEY=...` (paste key từ COPY SITE KEY), restart.
