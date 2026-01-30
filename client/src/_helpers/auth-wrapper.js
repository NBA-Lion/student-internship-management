import { authAtom } from '_state';
import { useRecoilState } from 'recoil';
import { useFetchWrapper } from '_helpers';
import { useProfileAction } from '_actions'; // Đã bỏ useAlertActions thừa
import { alertBachAtom } from '_state';
import { socketWrapper } from '_helpers/socket-wrapper';
import { clearNotificationQueue } from '_actions/socket.action';

export { useAuthWrapper };

function useAuthWrapper() {
    // console.log("Init Auth Wrapper");
    const [auth, setAuth] = useRecoilState(authAtom);
    
    // SỬA LỖI 1: Bỏ biến 'alert' thừa, chỉ lấy setAlert
    // Dấu phẩy ở đầu nghĩa là bỏ qua phần tử đầu tiên của mảng
    const [, setAlert] = useRecoilState(alertBachAtom);
    
    const fetchWrapper = useFetchWrapper();
    // SỬA LỖI 2: Đã xóa dòng khai báo alertActions vì không dùng
    const profileAction = useProfileAction();

    async function login(param) {
        console.log(">>> [Auth] Đang đăng nhập với Backend mới...");

        // Backend mới nhận { student_code, password }
        const payload = param && (param.username !== undefined)
            ? { student_code: param.username, password: param.password }
            : param;

        const response = await fetchWrapper.post("/api/auth/login", "application/json", payload);
        if (!response) {
            console.log(">>> [Lỗi] Không kết nối được Server");
            return { status: "Error", data: "Không kết nối được Server" };
        }

        const rawjson = await response.json();
        // Backend mới trả về { user, token }
        const { user, token } = rawjson || {};

        if (user && token) {
            // 1. Lưu token (Recoil + cookie)
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

            localStorage.setItem("userData", JSON.stringify(userProfile));
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
        
        // 3. Clear token and storage
        setLoginToken("");
        localStorage.clear();
        sessionStorage.clear();
        
        console.log(">>> [Auth] Đăng xuất hoàn tất.");
    }

    // --- 3. LƯU TOKEN ---
    function setLoginToken(token) {
        setAuth(token);
        var now = new Date();
        now.setTime(now.getTime() + (24 * 60 * 60 * 1000)); 
        document.cookie = `token=${token};expires=${now.toUTCString()};path=/`;
        console.log(">>> [Auth] Token đã lưu vào Cookie.");
    }

    // Với backend mới, thông tin user đã được trả về ngay trong /auth/login
    // nên loadUser chỉ cần đọc lại từ localStorage nếu có.
    async function loadUser() {
        try {
            const stored = localStorage.getItem("userData");
            if (!stored) return null;
            const userProfile = JSON.parse(stored);
            return userProfile;
        } catch (error) {
            console.error(">>> [Lỗi] Không tải được thông tin User từ localStorage:", error);
            return null;
        }
    }

    // --- 5. LẤY THÔNG TIN TỪ BỘ NHỚ ---
    async function getUserInfo() {
        let data = JSON.parse(localStorage.getItem("userData"));
        if (data && data.student_code) { 
            return data;
        } else {
            await loadUser();
            return JSON.parse(localStorage.getItem("userData"));
        }

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
    

    // --- 6. QUÊN MẬT KHẨU ---
    async function forgetPassword(params) {
        var urlencoded = new URLSearchParams();
        urlencoded.append("email", params.email);
        
        try {
            let response = await fetchWrapper.post("/api/auth/forget-password", "application/x-www-form-urlencoded", urlencoded);
            let data = await response.json();

            if (data.status === "Success") {
                setAlert({ message: "Thành công", description: "Vui lòng kiểm tra email." });
            } else {
                throw new Error(data.data || "Email không tồn tại.");
            }
        } catch (e) {
            setAlert({ message: "Thất bại", description: e.message });
        }
    }

    return {
        login,
        logout,
        tokenValue: auth,
        getUserInfo,
        forgetPassword,
        loadLoginToken,
        loadUser
    };
}