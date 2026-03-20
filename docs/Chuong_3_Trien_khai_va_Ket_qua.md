# CHƯƠNG 3: TRIỂN KHAI VÀ KẾT QUẢ

*Bản mẫu Chương 3 báo cáo thực tập — xưng "em", văn xuôi liền mạch, không gạch đầu dòng. Trích dẫn code tinh túy.*

---

## 3.1. Môi trường và công cụ phát triển

Trong suốt quá trình triển khai dự án Website Quản lý thực tập sinh, em làm việc trên môi trường máy tính cá nhân sử dụng hệ điều hành Windows, kết nối mạng nội bộ của đơn vị và khi cần truy cập từ xa thì sử dụng phần mềm mạng riêng ảo VPN (Sophos) theo quy định bảo mật của Trung tâm. Phần backend được phát triển với môi trường thực thi Node.js (phiên bản LTS 18.x hoặc 20.x), chạy trên nền Express và kết nối tới cơ sở dữ liệu MongoDB có thể đặt tại máy local hoặc trên dịch vụ đám mây MongoDB Atlas, chuỗi kết nối được cấu hình qua biến môi trường MONGODB_URI. Phần frontend được xây dựng bằng thư viện React phiên bản 17, khởi tạo dự án bằng Create React App và cấu hình build qua Craco, chạy trên trình duyệt Chrome hoặc Edge để tận dụng công cụ dành cho nhà phát triển khi gỡ lỗi giao diện và kiểm tra luồng API. Công tác soạn thảo mã nguồn được em thực hiện chủ yếu trên trình soạn thảo Visual Studio Code hoặc Cursor, kèm các tiện ích hỗ trợ định dạng và gợi ý mã cho JavaScript và JSX. Quản lý phiên bản mã nguồn được thực hiện bằng Git, với kho lưu trữ đặt trên GitHub để đồng bộ và lưu vết lịch sử thay đổi, đảm bảo không xung đột khi cập nhật code theo từng tính năng. Các thư viện chính phía server mà em sử dụng gồm Express, Mongoose, Socket.IO, bcryptjs, jsonwebtoken, Multer và XLSX; phía client gồm React, React Router DOM, Recoil, Ant Design, Material-UI, Axios, socket.io-client, React Hook Form, Yup và Recharts. Máy chủ phát triển chạy tại cổng mặc định 5000, ứng dụng React chạy tại cổng 3000, và em cấu hình biến REACT_APP_API_URL trỏ tới địa chỉ backend để mọi gọi API từ giao diện đều đi đúng tới máy chủ trong giai đoạn phát triển và kiểm thử. Ngoài môi trường chạy local, em còn triển khai phần giao diện (frontend) lên nền tảng Vercel để có thể truy cập ứng dụng qua đường dẫn trực tuyến; tại Vercel em kết nối kho mã nguồn GitHub và cấu hình build từ thư mục client với lệnh build của React, đồng thời khai báo biến môi trường REACT_APP_API_URL trỏ tới địa chỉ backend đang chạy (ví dụ trên Render hoặc máy chủ nội bộ) để sau khi deploy, giao diện vẫn gọi đúng API và hoạt động như trên môi trường phát triển.

---

## 3.2. Triển khai các chức năng cốt lõi

### 3.2.1. Đăng nhập và phân quyền

[CHÈN ẢNH GIAO DIỆN CHỨC NĂNG NÀY VÀO ĐÂY]

Trên giao diện, người dùng truy cập trang đăng nhập và nhập mã đăng nhập hoặc email cùng mật khẩu vào form được xây dựng bằng React Hook Form và kiểm tra hợp lệ bằng thư viện Yup. Khi gửi form, giao diện gọi API POST tới điểm cuối `/api/auth/login` thông qua lớp bọc fetch đã cấu hình sẵn tiêu đề và base URL. Máy chủ nhận body chứa student_code (hoặc email) và password, tra cứu người dùng trong collection Users của MongoDB theo điều kiện khớp mã hoặc email (không phân biệt hoa thường), so sánh mật khẩu bằng bcrypt. Nếu đúng, máy chủ tạo JWT bằng hàm generateToken chứa thông tin id, student_code, email, role và full_name với thời hạn bảy ngày, trả về object user (đã loại trường password) và token. Frontend lưu token vào bộ nhớ (localStorage hoặc state), cập nhật trạng thái Recoil và điều hướng người dùng về trang chủ hoặc đường dẫn trước đó. Trường hợp tài khoản bật xác thực hai yếu tố (2FA), luồng Authenticator được em triển khai theo các bước rõ ràng. Bước đầu tiên, người dùng nhập mã đăng nhập và mật khẩu rồi gửi lên máy chủ qua API POST `/api/auth/login` như đăng nhập thông thường. Bước thứ hai, máy chủ sau khi kiểm tra đúng mật khẩu và phát hiện tài khoản có bật TOTP (totpEnabled) thì trả về cờ requires2FA cùng tempToken (token tạm thời có thời hạn ngắn), không cấp JWT chính thức ngay. Bước thứ ba, giao diện nhận phản hồi đó và chuyển sang màn hình nhập mã sáu số từ ứng dụng xác thực (ví dụ Google Authenticator hoặc ứng dụng tương thích TOTP) mà người dùng đã liên kết khi thiết lập 2FA. Bước thứ tư, người dùng mở ứng dụng Authenticator, lấy mã sáu số đang hiển thị và nhập vào form, sau đó giao diện gửi yêu cầu POST tới `/api/auth/2fa/verify-login` kèm tempToken và mã vừa nhập. Bước cuối cùng, máy chủ xác minh mã TOTP so với secret đã lưu trong cơ sở dữ liệu; nếu đúng thì cấp JWT đầy đủ và trả về thông tin user, frontend lưu token và điều hướng vào hệ thống, nếu sai thì trả lỗi và người dùng có thể thử lại. Như vậy toàn bộ luồng xác thực và phân quyền đều dựa trên role lưu trong token, không lưu phiên trên máy chủ.

Đoạn mã cốt lõi phía Backend (xác thực và cấp token) như sau:

```javascript
// routes/auth.js – xử lý đăng nhập
const user = await User.findOne({
  $or: [
    { student_code: { $regex: new RegExp("^" + loginValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } },
    { email: { $regex: new RegExp("^" + loginValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } }
  ]
});
if (!user) return res.status(401).json({ message: "Mã đăng nhập/email hoặc mật khẩu không đúng." });
const passwordMatch = isBcryptHash(user.password)
  ? await bcrypt.compare(password, user.password)
  : user.password === password;
if (!passwordMatch) return res.status(401).json({ message: "Mã đăng nhập/email hoặc mật khẩu không đúng." });
const token = generateToken(user);
return res.json({ user: userResponse, token });
```

Đoạn mã trên thể hiện việc tìm người dùng theo mã hoặc email (regex không phân biệt hoa thường), kiểm tra mật khẩu hỗ trợ cả băm bcrypt và mật khẩu thô (phục vụ tài khoản mẫu hoặc di chuyển dữ liệu), sau đó sinh JWT và trả về thông tin user cùng token để client lưu và gắn vào mọi yêu cầu tiếp theo.

---

### 3.2.2. Quản lý sinh viên và xét duyệt hồ sơ

[CHÈN ẢNH GIAO DIỆN CHỨC NĂNG NÀY VÀO ĐÂY]

Quản trị viên sau khi đăng nhập được điều hướng tới khu vực quản lý sinh viên, nơi giao diện gọi API GET `/api/admin/students` kèm các tham số truy vấn như status, search, major, university và period_id để lọc và tìm kiếm. Backend áp dụng middleware xác thực JWT và kiểm tra role admin, thiết lập điều kiện truy vấn MongoDB chỉ lấy tài liệu có role là student, bổ sung điều kiện lọc theo internship_status hoặc registration_status, theo ngành, trường và đợt thực tập khi có tham số. Kết quả được sắp xếp theo student_code và trả về dạng JSON không kèm trường password. Khi quản trị viên thao tác duyệt hoặc từ chối hồ sơ, giao diện gửi yêu cầu PUT tới `/api/user/:id/status` với body chứa status (ví dụ "Đã duyệt", "Từ chối") và tuỳ chọn admin_note. Máy chủ kiểm tra quyền admin, xác thực giá trị status nằm trong tập hợp cho phép, cập nhật đồng thời internship_status và registration_status của người dùng tương ứng trong MongoDB. Trường hợp chọn "Đã duyệt", hệ thống gán luôn trạng thái "Đang thực tập". Sau khi cập nhật, nếu có cấu hình Socket.IO, máy chủ phát sự kiện status_updated tới phòng của sinh viên đó để giao diện bên client cập nhật trạng thái theo thời gian thực. Dữ liệu sinh viên và trạng thái duyệt hồ sơ đều được lưu trữ trong collection Users, đảm bảo nhất quán với các module đăng ký thực tập và đánh giá.

Đoạn mã cốt lõi phía Backend (lấy danh sách sinh viên và cập nhật trạng thái) như sau:

```javascript
// routes/admin.js – lấy danh sách sinh viên có lọc
let query = { role: "student" };
if (status) {
  query.$or = [
    { internship_status: status },
    { registration_status: status }
  ];
}
if (search && search.trim()) {
  const escaped = String(search.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  query = { ...query, $or: [
    { full_name: { $regex: escaped, $options: "i" } },
    { student_code: { $regex: escaped, $options: "i" } },
    { email: { $regex: escaped, $options: "i" } }
  ] };
}
const students = await User.find(query).select("-password").sort({ student_code: 1 }).lean();

// routes/user.js – cập nhật trạng thái hồ sơ (Admin)
const validStatuses = ["Chờ duyệt", "Đang thực tập", "Đã hoàn thành", "Từ chối", "Đã duyệt"];
if (!validStatuses.includes(status)) return res.status(400).json({ status: "Error", message: "Trạng thái không hợp lệ." });
const updateData = { internship_status: status, registration_status: status };
if (status === "Đã duyệt") {
  updateData.internship_status = "Đang thực tập";
  updateData.registration_status = "Đang thực tập";
}
await User.updateOne({ _id: user._id }, { $set: updateData });
```

Đoạn mã trên thể hiện cách xây dựng truy vấn MongoDB linh hoạt theo trạng thái và từ khoá tìm kiếm (có escape ký tự đặc biệt để tránh lỗi regex), đồng thời đảm bảo cập nhật trạng thái hồ sơ tuân theo tập giá trị hợp lệ và đồng bộ hai trường internship_status và registration_status trong collection Users.

---

### 3.2.3. Import dữ liệu hàng loạt từ Excel

[CHÈN ẢNH GIAO DIỆN CHỨC NĂNG NÀY VÀO ĐÂY]

Chức năng nhập liệu hàng loạt dành cho quản trị viên, được triển khai qua giao diện upload file Excel hoặc CSV. Người dùng chọn file và gửi lên máy chủ thông qua API POST `/api/import/users` (hoặc `/api/import/companies` cho đối tác doanh nghiệp), kèm tiêu đề Authorization chứa JWT. Backend sử dụng middleware Multer để nhận file, lưu tạm vào thư mục uploads/imports với tên file có timestamp, sau đó dùng thư viện XLSX đọc sheet đầu tiên và chuyển thành mảng đối tượng bằng sheet_to_json. Mỗi dòng dữ liệu được ánh xạ sang cấu trúc phù hợp với schema User (hoặc Company) thông qua hàm map: mã sinh viên, họ tên, email, mật khẩu mặc định nếu thiếu, role, cùng các trường bổ sung như lớp, khoa, trường, số điện thoại. Hệ thống kiểm tra bắt buộc mã và họ tên; nếu thiếu email thì có thể sinh tự động theo quy ước mã cộng với tên miền cấu hình. Các thao tác ghi vào MongoDB được thực hiện theo cơ chế upsert dựa trên student_code, tức là nếu bản ghi đã tồn tại thì cập nhật, chưa có thì tạo mới. Kết quả trả về bao gồm danh sách bản ghi thành công và danh sách dòng lỗi kèm lý do (thiếu trường, định dạng sai) để giao diện hiển thị báo cáo cho quản trị viên. Toàn bộ dữ liệu hợp lệ được ghi vào collection Users (hoặc Companies), đảm bảo tính toàn vẹn và tránh trùng lặp nhờ khóa student_code hoặc tên doanh nghiệp.

Đoạn mã cốt lõi phía Backend (đọc Excel và upsert người dùng) như sau:

```javascript
// routes/import.js – parse file và upsert User
const rawData = parseExcelFile(req.file.path);
for (let i = 0; i < rawData.length; i++) {
  const row = mapUserRow(rawData[i]);
  const studentCode = row.student_code || row.username;
  const fullName = row.full_name || row.name;
  if (!studentCode) { failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu mã sinh viên`, rowNum }); continue; }
  if (!fullName) { failed.push({ ...row, error: `Dòng ${rowNum}: Thiếu họ tên`, rowNum }); continue; }
  const userData = {
    student_code: codeStr,
    full_name: String(fullName).trim(),
    email: email || `${codeStr}@${AUTO_EMAIL_DOMAIN}`,
    password: row.password?.trim() || defaultPassword,
    role: 'student',
    university: row.university,
    faculty: row.faculty,
    major: row.major,
    class_name: row.class_name,
    // ... các trường khác
  };
  const filter = { student_code: userData.student_code };
  bulkOps.push({ updateOne: { filter, update: { $set: userData }, upsert: true } });
}
if (bulkOps.length) await User.bulkWrite(bulkOps);
```

Đoạn mã trên thể hiện quy trình đọc từng dòng Excel sau khi parse, kiểm tra bắt buộc mã và họ tên, bổ sung email mặc định khi thiếu, và dùng bulkWrite với updateOne kèm upsert: true để vừa cập nhật bản ghi cũ vừa tạo mới bản ghi chưa có trong collection Users, từ đó đạt được nhập liệu hàng loạt an toàn và có báo lỗi từng dòng.

---

### 3.2.4. Nhắn tin nội bộ thời gian thực (Socket.IO)

[CHÈN ẢNH GIAO DIỆN CHỨC NĂNG NÀY VÀO ĐÂY]

Tính năng trò chuyện cho phép sinh viên, cán bộ doanh nghiệp và quản trị viên trao đổi tin nhắn văn bản và file ngay trên hệ thống mà không cần ứng dụng bên thứ ba. Giao diện sau khi đăng nhập thiết lập kết nối Socket.IO tới cùng máy chủ HTTP, gửi kèm token trong handshake để middleware xác thực và gắn socket với định danh người dùng (student_code). Danh sách hội thoại được tải qua API GET `/api/chat/conversations`, backend dùng aggregation trên collection Messages để nhóm theo cặp sender-receiver, lấy tin nhắn gần nhất và đếm số tin chưa đọc, sau đó bổ sung thông tin người dùng từ collection Users. Khi người dùng gửi tin nhắn mới, client phát sự kiện "NewMessage" qua socket với tham số to (mã người nhận) và message (nội dung). Handler Socket.IO trên máy chủ nhận sự kiện, kiểm tra quyền (ví dụ HR/Mentor chỉ được nhắn với người cùng công ty hoặc Admin), tạo bản ghi mới trong collection Messages với sender, receiver, message và type, rồi phát lại sự kiện "NewMessage" tới phòng của người nhận và người gửi để cả hai cập nhật giao diện ngay lập tức. Tin nhắn được lưu vĩnh viễn trong MongoDB nên khi mở lại hội thoại, API GET `/api/chat/messages/:student_code` vẫn trả về đầy đủ lịch sử. Như vậy luồng dữ liệu vừa đảm bảo lưu trữ lâu dài qua REST và MongoDB, vừa đảm bảo trải nghiệm thời gian thực nhờ Socket.IO.

Đoạn mã cốt lõi phía Backend (Socket handler lưu tin và phát lại) như sau:

```javascript
// handlers/socket/messageHandler.js – xử lý sự kiện NewMessage
socket.on("NewMessage", async (data) => {
  const { to, message: content, type: msgType } = data || {};
  const from = userId;
  if (!to || content == null || String(content).trim() === "") {
    socket.emit("MessageError", { message: "Thiếu người nhận hoặc nội dung" });
    return;
  }
  const adminIds = await User.find({ role: "admin" }).distinct("student_code");
  let toResolved = to === "ADMIN" && adminIds.length > 0 ? adminIds[0] : to;
  // Kiểm tra quyền HR/Mentor: chỉ nhắn cùng công ty hoặc Admin (đoạn canChatWith lược bỏ)
  savedMessage = await Message.create({
    sender: from,
    receiver: toResolved,
    message: String(content).trim(),
    type: msgType === "image" || msgType === "file" ? msgType : "text",
  });
  const messagePayload = { _id: savedMessage._id, message: savedMessage.message, from: {...}, to: {...}, sender: from, receiver: toResolved, createdAt: savedMessage.createdAt };
  io.to(toResolved).emit("NewMessage", { ...messagePayload, isSender: false, selfSend: false });
  socket.emit("NewMessage", { ...messagePayload, isSender: true, selfSend: true });
});
```

Đoạn mã trên thể hiện việc nhận sự kiện NewMessage từ socket, chuẩn hoá người nhận (khi gửi tới "ADMIN" thì resolve thành mã admin thực tế), kiểm tra quyền theo role và company_id, ghi tin nhắn vào collection Messages, rồi phát lại payload tới phòng của người nhận và người gửi để giao diện hai bên cập nhật ngay mà vẫn giữ dữ liệu trong MongoDB.

---

## 3.3. Đánh giá kết quả đạt được

Hệ thống Website Quản lý thực tập sinh sau quá trình triển khai đã đáp ứng được các yêu cầu nghiệp vụ cốt lõi mà đơn vị đặt ra. Ứng dụng thay thế được cách quản lý rải rác bằng tệp Excel nhờ một nền tảng tập trung với đăng nhập bảo mật, phân quyền rõ ràng theo vai trò quản trị viên, sinh viên và cán bộ doanh nghiệp. Các chức năng xét duyệt hồ sơ, quản lý danh sách sinh viên kèm bộ lọc và phân trang, quản lý thông tin doanh nghiệp, nhập liệu hàng loạt từ Excel và nhắn tin nội bộ thời gian thực đều hoạt động ổn định trên cùng một kiến trúc MERN và Socket.IO, tạo điều kiện cho cơ quan vận hành và theo dõi thực tập sinh một cách thống nhất và minh bạch. Giao diện sử dụng thư viện Ant Design và Material-UI nên đảm bảo tính trực quan và thẩm mỹ chuyên nghiệp, phù hợp môi trường công vụ.

Bên cạnh những kết quả đạt được, hệ thống vẫn còn một số hạn chế cần lưu ý. Việc triển khai Socket.IO gắn trên cùng máy chủ HTTP đơn luồng có thể trở thành điểm nghẽn khi số lượng kết nối đồng thời tăng mạnh, và mô hình deploy single-instance chưa hỗ trợ mở rộng ngang cho nhiều replica. Chức năng import Excel phụ thuộc vào cấu trúc cột và tên trường trong file mẫu, nên khi đơn vị thay đổi quy cách file hoặc thêm cột mới thì cần cập nhật logic map và kiểm tra lại. Một số luồng nghiệp vụ phức tạp như gán mentor hàng loạt hoặc xuất báo cáo theo mẫu Word/PDF chưa được tự động hóa đầy đủ và vẫn dựa phần lớn vào thao tác thủ công trên giao diện. Ngoài ra, tài liệu hướng dẫn sử dụng cho từng vai trò người dùng chưa được tích hợp trực tiếp vào ứng dụng, có thể gây khó khăn cho người dùng mới làm quen.

Để nâng cao hiệu quả và khả năng mở rộng trong tương lai, em đề xuất hướng phát triển theo các trọng tâm sau. Về kiến trúc, có thể tách dịch vụ Socket.IO ra khỏi máy chủ HTTP và triển khai dùng Redis Adapter để đồng bộ sự kiện giữa nhiều instance, giúp hệ thống chịu tải tốt hơn khi số người dùng tăng. Về nghiệp vụ, nên bổ sung module xuất báo cáo theo mẫu (Word/PDF) và cho phép cấu hình mẫu file Excel import linh hoạt theo từng đợt thực tập. Việc tích hợp thêm thông báo đẩy (push notification) hoặc email tự động khi trạng thái hồ sơ thay đổi sẽ giúp sinh viên và cán bộ doanh nghiệp cập nhật kịp thời mà không cần mở ứng dụng liên tục. Cuối cùng, xây dựng bộ tài liệu hướng dẫn sử dụng và video ngắn gắn trong phần Trợ giúp của hệ thống sẽ góp phần nâng cao trải nghiệm và giảm tải công tác đào tạo tại đơn vị.

---

## 3.4. Tiểu kết Chương 3

Chương 3 đã trình bày quá trình triển khai các chức năng cốt lõi của hệ thống Quản lý thực tập sinh từ giao diện đến logic backend và cơ sở dữ liệu, bao gồm đăng nhập và phân quyền dựa trên JWT, quản lý và xét duyệt sinh viên, nhập liệu hàng loạt từ Excel và nhắn tin nội bộ thời gian thực qua Socket.IO. Thông qua việc bám sát mã nguồn thực tế và trích dẫn các đoạn code tiêu biểu, em đã làm rõ cách từng chức năng tương tác với API, MongoDB và Socket.IO trong dự án MERN. Phần đánh giá kết quả đã nêu được ưu điểm, hạn chế hiện tại và hướng phát triển mở rộng, từ đó phản ánh trung thực quá trình kiểm thử và vận hành tại đơn vị. Kinh nghiệm rút ra từ chương này giúp em củng cố kỹ năng phân tích luồng nghiệp vụ, thiết kế API REST và tích hợp kênh thời gian thực vào ứng dụng web, làm nền tảng cho các dự án phần mềm chuyên nghiệp sau này.
