import { io } from "socket.io-client";

class socketWrapper {
    // Đã xóa constructor thừa

    static isConnected = false;
    static feeder;
    static initiated = false;
    static socket = null;

    static initConnection(token) {
        if (!token) return;
        
        // console.log(">>> [Socket] Đang khởi tạo kết nối...");
        
        if (!socketWrapper.initiated) {
            // Kết nối tới Backend mới (port 5000)
            socketWrapper.socket = io("http://localhost:5000", {
                reconnectionDelayMax: 10000,
                auth: {
                    token: token
                },
                query: {
                    token: token
                },
                transports: ['websocket', 'polling'] // Ưu tiên websocket
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