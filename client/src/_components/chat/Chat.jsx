import { useEffect, useState, useRef } from 'react';
import { useRecoilValue, useRecoilState } from 'recoil';
import { Spin, Alert } from 'antd';
import Messenger from '_components/bach_component/Messenger';
import { authAtom } from '_state';
import { socketWrapper } from '_helpers/socket-wrapper';
import { socketConnected } from '_state/socket';

export { Chat };

const CONNECT_TIMEOUT_MS = 5000;

function Chat() {
    const auth = useRecoilValue(authAtom);
    const [isSocketConnected, setSocketConnected] = useRecoilState(socketConnected);
    const [loading, setLoading] = useState(true);
    const [connectError, setConnectError] = useState(false);
    const timeoutRef = useRef(null);
    const connectHandlerRef = useRef(null);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setConnectError(false);

        if (!socketWrapper.initiated) {
            socketWrapper.initConnection(auth);
        }

        const onConnect = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            setSocketConnected(true);
            setLoading(false);
            setConnectError(false);
        };

        if (socketWrapper.socket) {
            connectHandlerRef.current = onConnect;
            socketWrapper.socket.once('connect', onConnect);
            if (socketWrapper.isConnected) {
                onConnect();
                return;
            }
        }

        timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            setLoading(false);
            setConnectError(true);
            setSocketConnected(true);
        }, CONNECT_TIMEOUT_MS);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (socketWrapper.socket && connectHandlerRef.current) {
                socketWrapper.socket.off('connect', connectHandlerRef.current);
            }
        };
    }, [auth]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Đang kết nối..." />
            </div>
        );
    }

    if (connectError) {
        return (
            <div style={{ padding: 24 }}>
                <Alert
                    type="warning"
                    showIcon
                    message="Lỗi kết nối"
                    description="Không thể kết nối máy chủ chat trong thời gian chờ. Bạn vẫn có thể sử dụng giao diện nhưng tin nhắn real-time có thể không hoạt động."
                    style={{ marginBottom: 16 }}
                />
                <div style={{ height: '640px' }}>
                    <Messenger />
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '640px' }}>
            <Messenger />
        </div>
    );
}
