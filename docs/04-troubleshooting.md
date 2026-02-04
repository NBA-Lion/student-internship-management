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

---

## Reset mật khẩu (cho người test)

Khi người test đổi mật khẩu và bạn cần lấy lại:

```powershell
$env:MONGODB_URI="<uri-atlas>"; npm run reset-password -- ADMIN 123
```
