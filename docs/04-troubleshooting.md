# Xử lý lỗi

## Lỗi local (Development)

### MongoDB không kết nối được
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
- Kiểm tra MongoDB đang chạy: `mongosh`
- Windows: Services → MongoDB → Start

### Port đã được sử dụng
```
Error: listen EADDRINUSE :::5000
```
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>

# Hoặc: npx kill-port 5000
```

### OpenSSL Legacy Provider (Frontend)
```
Error: error:0308010C:digital envelope routines::unsupported
```
Đã fix trong `package.json`. Nếu vẫn lỗi, thêm `NODE_OPTIONS=--openssl-legacy-provider`.

### Cannot find module 'xxx'
```bash
rm -rf node_modules package-lock.json
npm install
```

### ResizeObserver loop
- Clear cache (Ctrl+Shift+Delete)
- Hard reload (Ctrl+Shift+R)

---

## Lỗi khi Deploy (Vercel + Render)

### CORS / Failed to fetch
- **Render** → Environment → thêm `FRONTEND_URL` = URL Vercel
- Save → chờ redeploy

### 401 Unauthorized (ADMIN / SV001)
Database Atlas chưa có user mẫu. Chạy seed với MONGODB_URI từ Render:
```powershell
$env:MONGODB_URI="<uri-atlas-từ-Render>"; npm run seed
```

### Màn hình trắng khi F5 / reload
- Kiểm tra `client/vercel.json` có cấu hình rewrites → `/index.html`
- Xem [deploy.md](./05-deploy.md)

### localhost khi đăng nhập (sau deploy)
- Vercel → Environment Variables → `REACT_APP_BACKEND_URL` = URL backend Render
- **Deployments** → **Redeploy** (build lại, không Promote)

### Thông tin cá nhân nhập xong không hiện trên Vercel
**Triệu chứng:** Sửa "Thông tin cá nhân" (profile) → bấm lưu thấy thành công, nhưng sau khi reload hoặc vào lại thì dữ liệu không còn / không hiện.

**Nguyên nhân:** Frontend trên Vercel chưa trỏ đúng backend. Nếu không có `REACT_APP_BACKEND_URL`, mọi request (lấy/cập nhật profile) gửi về `http://localhost:5000` — tức không tới server thật, nên dữ liệu không được lưu vào database production.

**Cách xử lý:**
1. Vercel → dự án → **Settings** → **Environment Variables**
2. Thêm (hoặc sửa): `REACT_APP_BACKEND_URL` = URL backend (vd: `https://student-internship-management.onrender.com`) — **không** có dấu `/` ở cuối
3. **Deployments** → **Redeploy** bản mới nhất (biến môi trường chỉ có hiệu lực sau khi build lại)
4. Kiểm tra: mở app Vercel → đăng nhập → sửa thông tin cá nhân → lưu → F5 hoặc đăng xuất rồi vào lại, thông tin vẫn còn

### Quên mật khẩu trả 500 / chạy lâu rồi lỗi

**Triệu chứng:** Bấm "Quên mật khẩu" → "Đang gửi..." rồi báo lỗi 500.

**Nguyên nhân:** Email service (Ethereal) không chạy ổn trên Render (timeout, mạng).

**Đã xử lý:** Backend sẽ **không crash** khi gửi email thất bại. Thay vào đó trả về link reset ngay trên màn hình — user copy link đó vào trình duyệt để đặt lại mật khẩu.

**Lưu ý:** Trên Render cần có `FRONTEND_URL` = URL Vercel để link reset đúng (vd: `https://xxx.vercel.app/reset-password/TOKEN`).

---

## Reset mật khẩu (cho người test)

Khi người test đổi mật khẩu và bạn cần lấy lại:

```powershell
$env:MONGODB_URI="<uri-atlas>"; npm run reset-password -- ADMIN 123
```
