import { useEffect } from 'react';
import { authAtom } from '_state';
import { useRecoilState } from 'recoil';
import { useFetchWrapper } from '_helpers';
import { useProfileAction } from '_actions';
import { alertBachAtom } from '_state';
import { socketWrapper } from '_helpers/socket-wrapper';
import { clearNotificationQueue } from '_actions/socket.action';
import { getToken, setToken, setUserData, clearAuth, getUserData } from '_helpers/auth-storage';

export { useAuthWrapper };

function useAuthWrapper() {
    const [auth, setAuth] = useRecoilState(authAtom);

    // Khi mount/reload: luôn lấy token từ sessionStorage của tab này → đúng role
    useEffect(() => {
        setAuth(getToken());
    }, []);
    
    // SỬA LỖI 1: Bỏ biến 'alert' thừa, chỉ lấy setAlert
    // Dấu phẩy ở đầu nghĩa là bỏ qua phần tử đầu tiên của mảng
    const [, setAlert] = useRecoilState(alertBachAtom);
    
    const fetchWrapper = useFetchWrapper();
    // SỬA LỖI 2: Đã xóa dòng khai báo alertActions vì không dùng
    const profileAction = useProfileAction();

    async function login(param) {
        console.log(">>> [Auth] Đang đăng nhập với Backend mới...");

        const payload = param && (param.username !== undefined)
            ? { student_code: param.username, password: param.password }
            : param;

        let response;
        try {
            response = await fetchWrapper.post("/api/auth/login", "application/json", payload);
        } catch (e) {
            const msg = (e && e.message) || "";
            const isNetwork = /failed to fetch|network|connection|refused/i.test(msg);
            setAlert({
                message: "Lỗi kết nối",
                description: isNetwork ? "Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa (npm start tại thư mục gốc)." : (msg || "Đăng nhập thất bại"),
            });
            return { status: "Error", data: isNetwork ? "Không kết nối được máy chủ" : (msg || "Đăng nhập thất bại") };
        }

        if (!response) {
            setAlert({ message: "Lỗi kết nối", description: "Không có phản hồi từ máy chủ." });
            return { status: "Error", data: "Không kết nối được Server" };
        }

        let rawjson;
        try {
            rawjson = response._data != null ? response._data : await response.json();
        } catch (_) {
            setAlert({ message: "Lỗi kết nối", description: "Phản hồi từ máy chủ không hợp lệ." });
            return { status: "Error", data: "Phản hồi không hợp lệ" };
        }

        // Bật 2FA: backend trả requires2FA + tempToken → không lưu token, báo client hiện bước nhập mã
        if (rawjson.requires2FA && rawjson.tempToken) {
            return { status: "Requires2FA", tempToken: rawjson.tempToken, message: rawjson.message };
        }

        // Backend mới trả về { user, token }
        const { user, token } = rawjson || {};

        if (user && token) {
            // 1. Lưu token (Recoil + sessionStorage theo tab)
            setLoginToken(token);

            // 2. Chuẩn hóa dữ liệu user và lưu vào localStorage
            const userProfile = {
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                student_code: user.student_code,
                role: user.role,
                phone: user.phone,
                dob: user.dob,
                university: user.university,
                faculty: user.faculty,
                major: user.major,
                internship_unit: user.internship_unit,
                internship_topic: user.internship_topic,
                internship_period: user.internship_period,
                start_date: user.start_date,
                end_date: user.end_date,
                cv_url: user.cv_url,
                recommendation_letter_url: user.recommendation_letter_url,
                registration_status: user.registration_status,
                mentor_name: user.mentor_name,
                mentor_feedback: user.mentor_feedback,
                final_grade: user.final_grade,
                admin_note: user.admin_note,
            };

            setUserData(userProfile);
            setAlert({ message: "Đăng nhập thành công", description: `Chào ${user.full_name || ""}` });

            // Trả về format mà tầng trên đang dùng
            return { status: "Success", data: userProfile, token };
        } else {
            const message = rawjson?.message || "Sai thông tin đăng nhập";
            setAlert({ message: "Đăng nhập thất bại", description: message });
            return { status: "Error", data: message };
        }
    }

    // --- 2. HÀM ĐĂNG XUẤT ---
    async function logout() {
        console.log(">>> [Auth] Đang đăng xuất...");
        
        // 1. Clear notification queue first
        clearNotificationQueue();
        
        // 2. Disconnect socket to prevent receiving messages for old user
        if (socketWrapper.socket) {
            console.log(">>> [Auth] Disconnecting socket...");
            socketWrapper.socket.disconnect();
            socketWrapper.socket = null;
            socketWrapper.isConnected = false;
        }
        
        // 3. Clear token and storage (theo tab)
        setLoginToken("");
        clearAuth();

        console.log(">>> [Auth] Đăng xuất hoàn tất.");
    }

    // --- 3. LƯU TOKEN (theo tab: sessionStorage) ---
    function setLoginToken(token) {
        setAuth(token || "");
        setToken(token || "");
        console.log(">>> [Auth] Token đã lưu (sessionStorage).");
    }

    async function loadUser() {
        try {
            const userProfile = getUserData();
            return (userProfile && (userProfile.student_code || userProfile._id)) ? userProfile : null;
        } catch (error) {
            console.error(">>> [Lỗi] Không tải được thông tin User:", error);
            return null;
        }
    }

    async function getUserInfo() {
        const data = getUserData();
        if (data && (data.student_code || data._id)) return data;
        await loadUser();
        return getUserData();
    }

    function loadLoginToken() {
        return async => {
            var allcookies = document.cookie;
            var cookiearray = allcookies.split(';');
            var token = '';
            for (var i = 0; i < cookiearray.length; i++) {
                var name = cookiearray[i].split('=')[0].trim();
                var value = cookiearray[i].split('=')[1];
                
                // SỬA LỖI 3: Thay == thành === (So sánh tuyệt đối)
                if (name === 'token') token = value;
            }
            if(token) setLoginToken(token);
        }
    }
    

    /** Gửi mã TOTP sau bước login (khi backend trả requires2FA). Trả về cùng format như login. */
    async function verify2FALogin(tempToken, code) {
        if (!tempToken || !code) {
            setAlert({ message: "Lỗi", description: "Vui lòng nhập mã 6 số" });
            return { status: "Error", data: "Vui lòng nhập mã 6 số" };
        }
        try {
            const response = await fetchWrapper.post("/api/auth/2fa/verify-login", "application/json", { tempToken, code: String(code).trim() });
            const rawjson = response._data != null ? response._data : await response.json();
            if (!rawjson || rawjson.status !== "Success" || !rawjson.user || !rawjson.token) {
                setAlert({ message: "Xác thực thất bại", description: rawjson?.message || "Mã không đúng hoặc đã hết hạn." });
                return { status: "Error", data: rawjson?.message || "Mã không đúng." };
            }
            const { user, token } = rawjson;
            setLoginToken(token);
            const userProfile = {
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                student_code: user.student_code,
                role: user.role,
                phone: user.phone,
                dob: user.dob,
                university: user.university,
                faculty: user.faculty,
                major: user.major,
                internship_unit: user.internship_unit,
                internship_topic: user.internship_topic,
                internship_period: user.internship_period,
                start_date: user.start_date,
                end_date: user.end_date,
                cv_url: user.cv_url,
                recommendation_letter_url: user.recommendation_letter_url,
                registration_status: user.registration_status,
                mentor_name: user.mentor_name,
                mentor_feedback: user.mentor_feedback,
                final_grade: user.final_grade,
                admin_note: user.admin_note,
            };
            setUserData(userProfile);
            setAlert({ message: "Đăng nhập thành công", description: `Chào ${user.full_name || ""}` });
            return { status: "Success", data: userProfile, token };
        } catch (e) {
            const msg = (e && e.message) || "";
            const isNetwork = /failed to fetch|network|connection|refused/i.test(msg);
            setAlert({
                message: "Lỗi",
                description: isNetwork ? "Không kết nối được máy chủ. Kiểm tra backend đã chạy." : (msg || "Xác thực thất bại"),
            });
            return { status: "Error", data: isNetwork ? "Không kết nối được máy chủ" : (msg || "Xác thực thất bại") };
        }
    }

    /** Đăng nhập bằng token + user (sau khi đăng ký thành công), không gọi API login. */
    function loginWithToken(user, token) {
        if (!user || !token) return { status: "Error", data: "Thiếu user hoặc token" };
        setLoginToken(token);
        const userProfile = {
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            student_code: user.student_code,
            role: user.role,
            phone: user.phone,
            dob: user.dob,
            university: user.university,
            faculty: user.faculty,
            major: user.major,
            internship_unit: user.internship_unit,
            internship_topic: user.internship_topic,
            internship_period: user.internship_period,
            start_date: user.start_date,
            end_date: user.end_date,
            cv_url: user.cv_url,
            recommendation_letter_url: user.recommendation_letter_url,
            registration_status: user.registration_status,
            mentor_name: user.mentor_name,
            mentor_feedback: user.mentor_feedback,
            final_grade: user.final_grade,
            admin_note: user.admin_note,
        };
        try { setUserData(userProfile); } catch (_) {}
        setAlert({ message: "Đăng ký thành công", description: `Chào ${user.full_name || ""}` });
        return { status: "Success", data: userProfile, token };
    }

    // --- 6. QUÊN MẬT KHẨU ---
    async function forgetPassword(params) {
        try {
            const response = await fetchWrapper.post("/api/auth/forgot-password", "application/json", { email: params.email });
            const data = await response.json();
            if (data.status === "Success") {
                setAlert({ message: "Thành công", description: data.message || "Vui lòng kiểm tra email." });
            } else {
                throw new Error(data.message || data.data || "Email không tồn tại.");
            }
        } catch (e) {
            setAlert({ message: "Thất bại", description: e.message });
        }
    }

    return {
        login,
        logout,
        loginWithToken,
        verify2FALogin,
        tokenValue: auth,
        getUserInfo,
        forgetPassword,
        loadLoginToken,
        loadUser
    };
}