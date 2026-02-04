# Deploy (MongoDB Atlas + Render + Vercel)

## 1. Backend (Render)

| Ô | Giá trị |
|---|---------|
| Source Code | GitHub repo |
| Name | `student-internship-management` |
| Language | Node |
| Branch | `main` |
| Root Directory | *(để trống)* |
| Build Command | `npm install` |
| Start Command | `npm start` |

**Environment:**
- `MONGODB_URI` = connection string từ MongoDB Atlas
- `FRONTEND_URL` = URL Vercel (dùng cho CORS và link reset mật khẩu)

## 2. Frontend (Vercel)

1. **Import** repo từ GitHub
2. **Configure:**
   - Root Directory: `client`
   - Framework: Create React App
   - Build: `npm run build`
   - Output: `build`
3. **Environment Variables:**
   - `REACT_APP_BACKEND_URL` = URL backend Render
   - (Nếu lỗi OpenSSL) `NODE_OPTIONS` = `--openssl-legacy-provider`
4. **Deploy** → lấy URL frontend
5. Cập nhật **Render** → `FRONTEND_URL` = URL Vercel

## 3. Seed database production

```powershell
$env:MONGODB_URI="<uri-atlas-từ-Render>"; npm run seed
```

## 4. Cảnh báo khi build (bỏ qua được)

Các cảnh báo deprecated từ CRA/react-scripts **không ảnh hưởng** — build vẫn thành công.

## 5. vercel.json (SPA routing)

Đã có `client/vercel.json` với rewrites để tránh màn hình trắng khi F5:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
