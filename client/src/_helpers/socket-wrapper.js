import { io } from "socket.io-client";

// Production: dùng REACT_APP_BACKEND_URL (Render). Trên Vercel cần set biến này khi build.
const SOCKET_URL = (process.env.NODE_ENV === 'production'
    ? (process.env.REACT_APP_BACKEND_URL || 'https://student-internship-management.onrender.com')
    : 'http://localhost:5000').replace(/\/$/, '');

class socketWrapper {
    static isConnected = false;
    static feeder;
    static initiated = false;
    static socket = null;

    static initConnection(token) {
        if (!token) return;

        if (!socketWrapper.initiated) {
            socketWrapper.socket = io(SOCKET_URL, {
                reconnectionDelayMax: 10000,
                auth: { token },
                query: { token },
                transports: ['websocket'],
                withCredentials: true
            });

            socketWrapper.initiated = true;

            // Lắng nghe sự kiện kết nối để debug cho dễ
            socketWrapper.socket.on("connect", () => {
                console.log(">>> [Socket] Đã kết nối thành công! ID:", socketWrapper.socket.id);
                socketWrapper.isConnected = true;
            });

            socketWrapper.socket.on("connect_error", (err) => {
                console.error(">>> [Socket] Lỗi kết nối:", err.message);
            });
        }
    }
}

export { socketWrapper };