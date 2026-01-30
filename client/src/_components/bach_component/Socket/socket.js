import React, { useEffect } from 'react';

import { alertBachAtom } from '_state/alert_bach';
import { authAtom } from '_state';
import { useRecoilState } from 'recoil';
import { socketWrapper } from '../../../_helpers/socket-wrapper';
import { getRecoil, setRecoil } from "recoil-nexus";
import useSocketAction from '_actions/socket.action';
import { SportsHockey } from '@mui/icons-material';
import { socketConnected } from '_state/socket';

export default function Socket(props) {
    let [auth, setAuth] = useRecoilState(authAtom)
    let socketAction = useSocketAction();
    var onNewPost = socketAction.onNewPost;
    var onNewMessage = socketAction.onNewMessage;
    var onNewComment = socketAction.onNewComment;
    var onConnected = socketAction.onConnected;
    var onUpdatePost = socketAction.onUpdatePost;
    let [isSocketConnected, setSocketConnected] = useRecoilState(socketConnected)
    // Trì hoãn khởi tạo Socket để không chặn load trang chính
    useEffect(() => {
        let intervalId = null;
        const timer = setTimeout(() => {
            if (!auth) return;
            if (!socketWrapper.initiated) {
                socketWrapper.initConnection(auth);
            }
            const sock = socketWrapper.socket;
            if (sock) {
                sock.removeAllListeners();
                sock.on("connect", onConnected);
                sock.on("NewPost", onNewPost);
                sock.on("NewComment", onNewComment);
                sock.on("NewMessage", onNewMessage);
                sock.on("UpdatePost", onUpdatePost);
            }
            intervalId = setInterval(() => {
                if (socketWrapper.isConnected) {
                    setSocketConnected(true);
                    clearInterval(intervalId);
                }
            }, 500);
        }, 800);
        return () => {
            clearTimeout(timer);
            if (intervalId) clearInterval(intervalId);
        };
    }, [auth])
    
    return (
      <></>
    );
}
