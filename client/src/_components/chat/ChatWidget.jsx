import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { Badge, Button, Drawer, Input, List, Avatar, Spin, Empty, Popconfirm, Modal, Upload, Tooltip, message, Dropdown, Menu } from 'antd';
import { 
    MessageOutlined, SendOutlined, SearchOutlined, UserOutlined, ArrowLeftOutlined,
    DeleteOutlined, PictureOutlined, SmileOutlined, CheckOutlined, LoadingOutlined,
    MoreOutlined, PushpinOutlined, InboxOutlined, BellOutlined, StopOutlined,
    EyeInvisibleOutlined
} from '@ant-design/icons';
import { useRecoilValue, useRecoilState } from 'recoil';
import { authAtom } from '_state';
import { socketConnected } from '_state/socket';
import useChatWrapper from '_helpers/chat-wrapper';
import useChatAction from '_actions/chat.action';
import { socketWrapper } from '_helpers/socket-wrapper';
import { API_BASE } from '_helpers/Constant';

// ============================================
// CONSTANTS
// ============================================
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2AhYaHiIaGhYSEgoGAf39/f39/gIGBgoODhIWFhYWFhYSEg4KBgH9/fn5+fn5/f4CBgoOEhIWFhYWEhIOCgYF/fn5+fn5+f4CAgYKDhISEhISEg4OCgYB/fn59fX5+fn+AgIGCg4OEhISEg4OCgYB/fn59fX5+fn+AgIGCgoODg4ODg4KBgH9+fX19fn5+f4CAgYKCg4ODg4OCgYGAf359fX19fn5/f4CAgYKCg4ODg4KCgYB/fn19fX19fn5/f4CAgYGCgoKCgoKBgH9+fX19fX5+fn+AgICBgYKCgoKCgYB/f359fX19fn5+f3+AgIGBgoKCgoGBgH9+fn19fX1+fn5/f4CAgYGBgYGBgYB/f359fX19fn5+fn9/gICAgYGBgYGAf39+fn19fX1+fn5+f3+AgICBgYGBgIB/f359fX19fX5+fn5/f4CAgICAgICAgH9/fn59fX19fX5+fn9/f4CAgICAgIB/f39+fn19fX19fn5+fn9/f4CAgICAgH9/f359fX19fX19fn5+fn9/f4CAgICAgH9/fn5+fX19fX19fn5+fn9/f39/f39/f39+fn59fX19fX19fn5+fn9/f39/f39/f35+fn59fX19fX19fn5+fn5/f39/f39/f35+fn59fX19fX19fX5+fn5+f39/f39/f35+fn59fX19fX19fX5+fn5+fn9/f39/f35+fn59fX19fX19fX5+fn5+fn5/f39/f35+fn59fX19fX19fX5+fn5+fn5/f39/f39+fn59fX19fX19fX5+fn5+fn5+f39/f39+fn59fX19fX19fX1+fn5+fn5+fn9/f39+fn59fX19fX19fX1+fn5+fn5+fn5/f39+fn59fX19fX19fX1+fn5+fn5+fn5+f39+fn59fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fn5+fn5+fn5+fn5+fn5+fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn19fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn19fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fn59fX19fX19fX1+fn5+fn5+fn5+fn5+fn5+fX19fX19fX19fn5+fn5+fn5+fn5+fn5+fn59fX19fX19fn5+fn5+fn5+fn5+fn5+fn5+fn59fX19fn5+fn5+fn5+fn5+fn5+fn5+fn59fX5+fn5+fn5+fn5+fn5+fn5+fn5+fn59fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5';
const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '😊', '👍', '❤️', '🔥', '👏', '🎉', '😢', '😮'];

// ============================================
// REDUCER FOR COMPLEX STATE MANAGEMENT
// ============================================
const initialState = {
    conversations: [],
    currentMessages: [],
    unreadTotal: 0,
    isLoading: false
};

function chatReducer(state, action) {
    switch (action.type) {
        case 'SET_CONVERSATIONS':
            return { 
                ...state, 
                conversations: action.payload,
                unreadTotal: action.payload.reduce((sum, c) => sum + (c.unread_count || 0), 0)
            };
        
        case 'SET_MESSAGES':
            return { ...state, currentMessages: action.payload };
        
        case 'ADD_MESSAGE': {
            const { message, partnerId, myId } = action.payload;
            const senderId = message.from?.vnu_id || message.sender;
            const receiverId = message.to?.vnu_id || message.receiver;
            const isFromPartner = senderId === partnerId;
            const isToPartner = receiverId === partnerId;
            const isMyMessage = senderId === myId || message.selfSend || message.isSender;
            
            let newMessages = [...state.currentMessages];
            
            // ============================================
            // SMART DEDUPLICATION for Optimistic UI
            // ============================================
            if (isFromPartner || isToPartner) {
                // Check for exact ID match
                const existsById = newMessages.some(m => m._id === message._id);
                
                // Check for optimistic message that server is confirming
                // (same sender, receiver, message content within 10 seconds)
                const optimisticIndex = isMyMessage ? newMessages.findIndex(m => 
                    m._isOptimistic && 
                    m.message === message.message && 
                    m.receiver === message.receiver
                ) : -1;

                if (existsById) {
                    // Already have this exact message, skip
                    console.log('>>> [Reducer] Skipping duplicate message:', message._id);
                } else if (optimisticIndex >= 0) {
                    // Replace optimistic message with server-confirmed version
                    console.log('>>> [Reducer] Replacing optimistic message with confirmed:', message._id);
                    newMessages[optimisticIndex] = { ...message, _isOptimistic: false };
                } else {
                    // New message, add it
                    console.log('>>> [Reducer] Adding new message:', message._id);
                    newMessages = [...newMessages, message];
                }
            }
            
            // ============================================
            // UPDATE CONVERSATIONS LIST
            // ============================================
            const otherUserId = senderId === myId ? receiverId : senderId;
            let newConversations = [...state.conversations];
            const convIndex = newConversations.findIndex(c => 
                c.partner_id === otherUserId || 
                c.partner?.vnu_id === otherUserId ||
                c.partner?.student_code === otherUserId
            );
            
            if (convIndex >= 0) {
                const conv = { ...newConversations[convIndex] };
                conv.last_message = {
                    _id: message._id,
                    message: message.message,
                    type: message.type,
                    sender: senderId,
                    is_mine: senderId === myId,
                    createdAt: message.createdAt
                };
                conv.timestamp = message.createdAt;
                
                // Only increment unread if message is from someone else AND not in active chat
                if (senderId !== myId && partnerId !== otherUserId) {
                    conv.unread_count = (conv.unread_count || 0) + 1;
                }
                
                // Move conversation to top
                newConversations.splice(convIndex, 1);
                newConversations.unshift(conv);
            } else if (message.newContact || (!isMyMessage && convIndex < 0)) {
                // New contact - add to list
                newConversations.unshift({
                    partner_id: otherUserId,
                    partner: senderId === myId ? message.to : message.from,
                    last_message: {
                        _id: message._id,
                        message: message.message,
                        type: message.type,
                        sender: senderId,
                        is_mine: senderId === myId,
                        createdAt: message.createdAt
                    },
                    unread_count: senderId === myId ? 0 : 1,
                    timestamp: message.createdAt
                });
            }
            
            return { 
                ...state, 
                currentMessages: newMessages,
                conversations: newConversations,
                unreadTotal: newConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
            };
        }
        
        case 'MARK_READ': {
            const { partnerId } = action.payload;
            const conv = state.conversations.find(c => 
                c.partner_id === partnerId || 
                c.partner?.vnu_id === partnerId ||
                c.partner?.student_code === partnerId
            );
            const unreadToRemove = conv?.unread_count || 0;
            
            const newConversations = state.conversations.map(c => 
                (c.partner_id === partnerId || c.partner?.vnu_id === partnerId || c.partner?.student_code === partnerId)
                    ? { ...c, unread_count: 0 }
                    : c
            );
            return { 
                ...state, 
                conversations: newConversations,
                unreadTotal: Math.max(0, state.unreadTotal - unreadToRemove)
            };
        }
        
        case 'MARK_UNREAD': {
            const { partnerId } = action.payload;
            const newConversations = state.conversations.map(c => 
                (c.partner_id === partnerId || c.partner?.vnu_id === partnerId || c.partner?.student_code === partnerId)
                    ? { ...c, unread_count: Math.max(1, c.unread_count || 0) }
                    : c
            );
            const addedUnread = newConversations.find(c => c.partner_id === partnerId)?.unread_count === 1 ? 1 : 0;
            return { 
                ...state, 
                conversations: newConversations,
                unreadTotal: state.unreadTotal + addedUnread
            };
        }
        
        case 'DELETE_CONVERSATION': {
            const { partnerId } = action.payload;
            const conv = state.conversations.find(c => 
                c.partner_id === partnerId || 
                c.partner?.vnu_id === partnerId ||
                c.partner?.student_code === partnerId
            );
            const unreadToRemove = conv?.unread_count || 0;
            
            const newConversations = state.conversations.filter(c => 
                c.partner_id !== partnerId && 
                c.partner?.vnu_id !== partnerId &&
                c.partner?.student_code !== partnerId
            );
            
            return { 
                ...state, 
                conversations: newConversations,
                currentMessages: [],
                unreadTotal: Math.max(0, state.unreadTotal - unreadToRemove)
            };
        }
        
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        
        default:
            return state;
    }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ChatWidget() {
    const auth = useRecoilValue(authAtom);
    const [isSocketConnected] = useRecoilState(socketConnected);
    
    // UI State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [lastTypingTime, setLastTypingTime] = useState(0);
    
    // Menu state
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    
    // Complex state with reducer
    const [state, dispatch] = useReducer(chatReducer, initialState);
    
    // Refs
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const drawerOpenRef = useRef(drawerOpen);
    const selectedUserRef = useRef(selectedUser);
    const menuRef = useRef(null);
    const stateRef = useRef(state);

    useEffect(() => { drawerOpenRef.current = drawerOpen; }, [drawerOpen]);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
    useEffect(() => { stateRef.current = state; }, [state]);
    
    const chatWrapper = useChatWrapper();

    // Current user info
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const myStudentCode = currentUser.student_code || currentUser.vnu_id || '';

    // ============================================
    // CLICK OUTSIDE TO CLOSE MENU
    // ============================================
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeMenuId && menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    // ============================================
    // NOTIFICATION SOUND
    // ============================================
    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND);
        audioRef.current.volume = 0.5;
    }, []);

    const playNotificationSound = useCallback(() => {
        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
            }
        } catch (e) {}
    }, []);

    // ============================================
    // FETCH CONVERSATIONS
    // ============================================
    const fetchConversations = useCallback(async () => {
        if (!auth) return;
        try {
            const response = await fetch(`${API_BASE}/api/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${auth}` }
            });
            const data = await response.json();
            if (data.status === 'Success') {
                dispatch({ type: 'SET_CONVERSATIONS', payload: data.data || [] });
            }
        } catch (error) {
            console.error('Fetch conversations error:', error);
        }
    }, [auth]);

    // ============================================
    // FETCH MESSAGES
    // ============================================
    const fetchMessages = useCallback(async (userId) => {
        if (!auth || !userId) return;
        try {
            const response = await fetch(`${API_BASE}/api/chat/messages/${userId}`, {
                headers: { 'Authorization': `Bearer ${auth}` }
            });
            const data = await response.json();
            if (data.status === 'Success') {
                const serverList = data.data || [];
                const serverIds = new Set(serverList.map((m) => m._id));
                const current = stateRef.current?.currentMessages || [];
                const inConv = (m) =>
                    (m.sender === myStudentCode && m.receiver === userId) ||
                    (m.receiver === myStudentCode && m.sender === userId);
                const optimisticKeep = current.filter(
                    (m) => inConv(m) && m._isOptimistic && !serverIds.has(m._id)
                );
                const realKeep = current.filter(
                    (m) => inConv(m) && !m._isOptimistic && !serverIds.has(m._id)
                );
                const merged = [...serverList, ...optimisticKeep, ...realKeep].sort(
                    (a, b) => new Date(a.createdAt || a.createdDate || 0) - new Date(b.createdAt || b.createdDate || 0)
                );
                dispatch({ type: 'SET_MESSAGES', payload: merged });
                dispatch({ type: 'MARK_READ', payload: { partnerId: userId } });
            }
        } catch (error) {
            console.error('Fetch messages error:', error);
        }
    }, [auth, myStudentCode]);

    // ============================================
    // SOCKET LISTENERS
    // ============================================
    useEffect(() => {
        if (!socketWrapper.socket || !myStudentCode) return;

        const socket = socketWrapper.socket;

        const handleTyping = (data) => {
            if (data.from) setTypingUsers(prev => new Set([...prev, data.from]));
        };

        const handleStopTyping = (data) => {
            if (data.from) {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.from);
                    return newSet;
                });
            }
        };

        const handleNewMessage = (msg) => {
            const senderId = msg.from?.vnu_id || msg.sender;
            const receiverId = msg.to?.vnu_id || msg.receiver;
            const isMyMessage = msg.selfSend || msg.isSender || senderId === myStudentCode;
            const currentSelectedId = selectedUserRef.current?.vnu_id || selectedUserRef.current?.student_code;
            
            console.log('>>> [ChatWidget] NewMessage received:', {
                msgId: msg._id,
                senderId,
                receiverId,
                isMyMessage,
                currentSelectedId,
                selfSend: msg.selfSend,
                isSender: msg.isSender
            });

            // ============================================
            // CRITICAL: Check if this message is for current conversation
            // ============================================
            const isFromCurrentPartner = senderId === currentSelectedId;
            const isToCurrentPartner = receiverId === currentSelectedId;
            const isRelevantToCurrentChat = isFromCurrentPartner || isToCurrentPartner;

            // ============================================
            // CASE 1: My own message coming back from server
            // Skip if we already showed it optimistically
            // ============================================
            if (isMyMessage) {
                // Server confirmed our message - we already showed it optimistically
                // But we need to update conversations list for the preview
                dispatch({ 
                    type: 'ADD_MESSAGE', 
                    payload: { message: msg, partnerId: currentSelectedId, myId: myStudentCode }
                });
                console.log('>>> [ChatWidget] Own message confirmed by server');
                return;
            }

            // ============================================
            // CASE 2: Incoming message from the person I'm chatting with
            // INSTANTLY show it in the chat window
            // ============================================
            if (isFromCurrentPartner && drawerOpenRef.current) {
                console.log('>>> [ChatWidget] Message from active chat partner - adding to UI');
                dispatch({ 
                    type: 'ADD_MESSAGE', 
                    payload: { message: msg, partnerId: currentSelectedId, myId: myStudentCode }
                });
                
                // Auto scroll to see the new message
                setTimeout(() => {
                    if (messagesEndRef.current) {
                        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
                return;
            }

            // ============================================
            // CASE 3: Message from someone else (not current chat)
            // Show notification, update unread count
            // ============================================
            dispatch({ 
                type: 'ADD_MESSAGE', 
                payload: { message: msg, partnerId: currentSelectedId, myId: myStudentCode }
            });

            // Play notification sound and show desktop notification
            if (!drawerOpenRef.current || currentSelectedId !== senderId) {
                playNotificationSound();
                if (Notification.permission === 'granted') {
                    new Notification(`Tin nhắn từ ${msg.from?.name || 'Người dùng'}`, {
                        body: msg.type === 'image' ? '📷 Đã gửi một hình ảnh' : msg.message,
                        icon: '/favicon.ico',
                        tag: `chat-${senderId}`
                    });
                }
            }
        };

        const handleConversationDeleted = (data) => {
            const partnerId = data.by || data.with;
            if (partnerId) {
                dispatch({ type: 'DELETE_CONVERSATION', payload: { partnerId } });
                if (selectedUserRef.current?.vnu_id === partnerId || 
                    selectedUserRef.current?.student_code === partnerId) {
                    setSelectedUser(null);
                }
                if (data.by) message.info('Cuộc trò chuyện đã bị xóa bởi người khác');
            }
        };

        socket.on('UserTyping', handleTyping);
        socket.on('UserStopTyping', handleStopTyping);
        socket.on('NewMessage', handleNewMessage);
        socket.on('ConversationDeleted', handleConversationDeleted);

        return () => {
            socket.off('UserTyping', handleTyping);
            socket.off('UserStopTyping', handleStopTyping);
            socket.off('NewMessage', handleNewMessage);
            socket.off('ConversationDeleted', handleConversationDeleted);
        };
    }, [myStudentCode, playNotificationSound]);

    useEffect(() => {
        if (Notification.permission === 'default') Notification.requestPermission();
    }, []);

    // ============================================
    // AUTO-SCROLL
    // ============================================
    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior });
    }, []);

    useEffect(() => { scrollToBottom(); }, [state.currentMessages, scrollToBottom]);

    // ============================================
    // LOAD DATA ON DRAWER OPEN
    // ============================================
    useEffect(() => {
        if (drawerOpen && auth) fetchConversations();
    }, [drawerOpen, auth, fetchConversations]);

    // ============================================
    // SHORT POLLING FALLBACK (Vercel/serverless: Socket.io unreliable)
    // Poll messages every 2s when a conversation is open so receiver sees new messages without reload
    // ============================================
    const POLL_INTERVAL_MS = 2000;
    useEffect(() => {
        if (!selectedUser || !drawerOpen) return;
        const userId = selectedUser.vnu_id || selectedUser.student_code;
        if (!userId) return;

        const intervalId = setInterval(() => {
            fetchMessages(userId);
        }, POLL_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [selectedUser, drawerOpen, fetchMessages]);

    // ============================================
    // HANDLERS
    // ============================================
    const handleSelectUser = useCallback(async (user) => {
        const userId = user.vnu_id || user.student_code || user.partner_id;
        const userObj = user.partner || {
            vnu_id: userId,
            student_code: userId,
            name: user.name || user.partner?.name,
            email: user.email,
            avatar_url: user.avatar_url
        };
        
        setSelectedUser(userObj);
        setShowEmojiPicker(false);
        setActiveMenuId(null);
        
        if (userId) {
            chatWrapper.setCurChatPerson(userId);
            await fetchMessages(userId);
            dispatch({ type: 'MARK_READ', payload: { partnerId: userId } });
        }
    }, [chatWrapper, fetchMessages]);

    const emitTyping = useCallback(() => {
        if (!selectedUser || !socketWrapper.socket) return;
        const userId = selectedUser.vnu_id || selectedUser.student_code;
        const now = Date.now();
        
        if (now - lastTypingTime > 2000) {
            socketWrapper.socket.emit('Typing', { to: userId });
            setLastTypingTime(now);
        }
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socketWrapper.socket) socketWrapper.socket.emit('StopTyping', { to: userId });
        }, 3000);
    }, [selectedUser, lastTypingTime]);

    const handleSendMessage = useCallback(() => {
        if (!messageText.trim() || !selectedUser) return;
        const userId = selectedUser.vnu_id || selectedUser.student_code;
        const trimmedMessage = messageText.trim();
        
        // ============================================
        // OPTIMISTIC UI: Show message INSTANTLY before server confirms
        // ============================================
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMessage = {
            _id: tempId,
            message: trimmedMessage,
            type: 'text',
            sender: myStudentCode,
            receiver: userId,
            from: {
                vnu_id: myStudentCode,
                id: myStudentCode,
                name: currentUser.full_name || 'Tôi'
            },
            to: {
                vnu_id: userId,
                id: userId,
                name: selectedUser.name || userId
            },
            createdAt: new Date().toISOString(),
            createdDate: new Date().toISOString(),
            selfSend: true,
            isSender: true,
            _isOptimistic: true // Flag to identify optimistic messages
        };

        // IMMEDIATELY add to state (Optimistic Update)
        dispatch({ 
            type: 'ADD_MESSAGE', 
            payload: { 
                message: optimisticMessage, 
                partnerId: userId, 
                myId: myStudentCode 
            }
        });

        // Clear input immediately for snappy UX
        setMessageText('');
        setShowEmojiPicker(false);

        // Emit to server in background
        if (socketWrapper.socket) {
            socketWrapper.socket.emit('StopTyping', { to: userId });
            socketWrapper.socket.emit('NewMessage', { 
                to: userId, 
                message: trimmedMessage,
                tempId: tempId // Send tempId so server can help deduplicate
            });
        }

        // Scroll to bottom after state update
        setTimeout(() => scrollToBottom(), 50);
    }, [messageText, selectedUser, scrollToBottom, myStudentCode, currentUser]);

    const handleSearch = useCallback(async (value) => {
        setSearchText(value);
        if (!value.trim()) { setSearchResults([]); return; }

        setSearching(true);
        try {
            const response = await fetch(`${API_BASE}/api/chat/users?search=${encodeURIComponent(value)}`, {
                headers: { 'Authorization': `Bearer ${auth}` }
            });
            const data = await response.json();
            if (data.status === 'Success') setSearchResults(data.data || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    }, [auth]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ============================================
    // MENU ACTIONS
    // ============================================
    const handleMenuAction = useCallback((action, partnerId) => {
        setActiveMenuId(null);
        
        switch (action) {
            case 'pin':
                message.info('📌 Tính năng Ghim đang phát triển');
                break;
            case 'archive':
                message.info('📦 Tính năng Lưu trữ đang phát triển');
                break;
            case 'mute':
                message.info('🔕 Tính năng Tắt thông báo đang phát triển');
                break;
            case 'mark_unread':
                dispatch({ type: 'MARK_UNREAD', payload: { partnerId } });
                message.success('✉️ Đã đánh dấu là chưa đọc');
                break;
            case 'block':
                message.warning('🚫 Tính năng Chặn đang phát triển');
                break;
            case 'delete':
                setDeleteConfirmId(partnerId);
                break;
            default:
                break;
        }
    }, []);

    // ============================================
    // DELETE CONVERSATION
    // ============================================
    const handleDeleteConversation = useCallback(async (partnerId) => {
        if (!partnerId) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/chat/conversation/${partnerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth}` }
            });
            const data = await response.json();
            
            if (data.status === 'Success') {
                message.success(`Đã xóa cuộc trò chuyện (${data.deletedCount || 0} tin nhắn)`);
                dispatch({ type: 'DELETE_CONVERSATION', payload: { partnerId } });
                setDeleteConfirmId(null);
                
                if (selectedUser?.vnu_id === partnerId || selectedUser?.student_code === partnerId) {
                    setSelectedUser(null);
                    chatWrapper.setCurChatPerson(null);
                }
                
                setTimeout(() => fetchConversations(), 300);
            } else {
                message.error(data.message || 'Lỗi xóa cuộc trò chuyện');
            }
        } catch (error) {
            message.error('Lỗi kết nối server');
        }
    }, [auth, chatWrapper, fetchConversations, selectedUser]);

    // ============================================
    // IMAGE UPLOAD
    // ============================================
    const handleImageUpload = useCallback(async (file) => {
        if (!selectedUser) return false;
        const userId = selectedUser.vnu_id || selectedUser.student_code;
        setUploading(true);
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('to', userId);
        
        try {
            const response = await fetch(`${API_BASE}/api/chat/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${auth}` },
                body: formData
            });
            const data = await response.json();
            if (data.status !== 'Success') message.error(data.message || 'Lỗi upload ảnh');
        } catch (error) {
            message.error('Lỗi kết nối server');
        } finally {
            setUploading(false);
        }
        return false;
    }, [selectedUser, auth]);

    // ============================================
    // FORMAT MESSAGES
    // ============================================
    const formatMessages = useCallback(() => {
        return state.currentMessages.map(msg => {
            const senderId = msg.from?.vnu_id || msg.sender || '';
            const isMine = senderId === myStudentCode;
            const timestamp = msg.createdDate || msg.createdAt;
            const time = timestamp 
                ? new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : '';
            
            return {
                id: msg._id,
                text: msg.message,
                type: msg.type || 'text',
                attachment_url: msg.attachment_url,
                isMine,
                senderId,
                senderName: msg.from?.name || senderId,
                time,
                timestamp,
                is_read: msg.is_read
            };
        });
    }, [state.currentMessages, myStudentCode]);

    const formattedMessages = formatMessages();
    const contactList = searchText.trim() 
        ? searchResults.map(u => ({
            partner_id: u.vnu_id,
            partner: u,
            vnu_id: u.vnu_id,
            name: u.name,
            email: u.email,
            avatar_url: u.avatar_url,
            unread_count: 0
          }))
        : state.conversations;

    const isOtherTyping = selectedUser && typingUsers.has(selectedUser.vnu_id || selectedUser.student_code);

    // ============================================
    // RENDER MESSAGE BUBBLE
    // ============================================
    const renderMessageBubble = (msg, idx, messages) => {
        const { isMine, text, time, id, type, attachment_url } = msg;
        const prevMsg = messages[idx - 1];
        const nextMsg = messages[idx + 1];
        const isFirstInSequence = !prevMsg || prevMsg.isMine !== isMine;
        const isLastInSequence = !nextMsg || nextMsg.isMine !== isMine;
        
        const getBorderRadius = () => {
            if (isMine) {
                return {
                    borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
                    borderTopRightRadius: isFirstInSequence ? 18 : 4,
                    borderBottomRightRadius: isLastInSequence ? 18 : 4,
                };
            }
            return {
                borderTopRightRadius: 18, borderBottomRightRadius: 18,
                borderTopLeftRadius: isFirstInSequence ? 18 : 4,
                borderBottomLeftRadius: isLastInSequence ? 18 : 4,
            };
        };

        return (
            <div key={id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: isLastInSequence ? 8 : 2 }}>
                {type === 'image' && attachment_url ? (
                    <div style={{ maxWidth: '75%', ...getBorderRadius(), overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                         onClick={() => setPreviewImage(`${API_BASE}${attachment_url}`)}>
                        <img src={`${API_BASE}${attachment_url}`} alt="Sent" style={{ maxWidth: '100%', maxHeight: 200, display: 'block', borderRadius: 'inherit' }} />
                    </div>
                ) : (
                    <div style={{ maxWidth: '75%', padding: '10px 14px', ...getBorderRadius(), backgroundColor: isMine ? '#0084ff' : '#e4e6eb', color: isMine ? '#ffffff' : '#050505', wordBreak: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: 14, lineHeight: 1.4 }}>{text}</div>
                    </div>
                )}
                {isLastInSequence && time && (
                    <div style={{ fontSize: 11, color: '#65676b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {time}
                        {isMine && msg.is_read && <CheckOutlined style={{ fontSize: 10, color: '#0084ff' }} />}
                    </div>
                )}
            </div>
        );
    };

    // ============================================
    // RENDER CONTACT ITEM WITH MENU
    // ============================================
    const renderContactItem = (item) => {
        const partner = item.partner || item;
        const partnerId = item.partner_id || partner.vnu_id || partner.student_code;
        const name = partner.name || partner.vnu_id || partnerId;
        const lastMsg = item.last_message;
        const unread = item.unread_count || 0;
        
        let description = 'Nhấn để chat';
        if (lastMsg) {
            const prefix = lastMsg.is_mine ? 'Bạn: ' : '';
            description = prefix + (lastMsg.type === 'image' ? '📷 Hình ảnh' : lastMsg.message);
        }

        // Menu for antd v4 (using overlay instead of menu prop)
        const dropdownMenu = (
            <Menu>
                <Menu.Item key="pin" icon={<PushpinOutlined />} onClick={() => handleMenuAction('pin', partnerId)}>
                    Ghim
                </Menu.Item>
                <Menu.Item key="archive" icon={<InboxOutlined />} onClick={() => handleMenuAction('archive', partnerId)}>
                    Lưu trữ
                </Menu.Item>
                <Menu.Item key="mute" icon={<BellOutlined />} onClick={() => handleMenuAction('mute', partnerId)}>
                    Tắt thông báo
                </Menu.Item>
                <Menu.Item key="mark_unread" icon={<EyeInvisibleOutlined />} onClick={() => handleMenuAction('mark_unread', partnerId)}>
                    Đánh dấu chưa đọc
                </Menu.Item>
                <Menu.Item key="block" icon={<StopOutlined />} onClick={() => handleMenuAction('block', partnerId)}>
                    Chặn
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item key="delete" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} onClick={() => handleMenuAction('delete', partnerId)}>
                    <span style={{ color: '#ff4d4f' }}>Xóa hội thoại</span>
                </Menu.Item>
            </Menu>
        );

        return (
            <List.Item 
                style={{ 
                    padding: '10px 16px', 
                    cursor: 'pointer', 
                    borderBottom: 'none',
                    background: unread > 0 ? '#f0f7ff' : 'transparent',
                    position: 'relative'
                }}
                className="chat-contact-item"
            >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }} onClick={() => handleSelectUser(item)}>
                    <Badge count={unread} size="small" offset={[-5, 5]}>
                        <Avatar icon={<UserOutlined />} size={48} style={{ backgroundColor: unread > 0 ? '#ff4d4f' : '#0084ff' }} />
                    </Badge>
                    
                    <div style={{ flex: 1, marginLeft: 12, overflow: 'hidden', minWidth: 0 }}>
                        <div style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 14, display: 'flex', alignItems: 'center' }}>
                            {name}
                                        {partner.role && (
                                            <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 400, marginLeft: 6 }}>
                                                ({partner.role === 'admin' ? 'Admin' : 
                                                  partner.role === 'lecturer' ? 'GV' : 
                                                  partner.role === 'teacher' ? 'GV' : 'SV'})
                                            </span>
                                        )}
                        </div>
                        <div style={{ color: unread > 0 ? '#050505' : '#65676b', fontSize: 13, fontWeight: unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {description}
                        </div>
                    </div>
                </div>
                
                {/* Three Dots Menu Button - antd v4 format */}
                <Dropdown
                    overlay={dropdownMenu}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Button 
                        type="text" 
                        icon={<MoreOutlined style={{ fontSize: 18 }} />}
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            opacity: 0.6,
                            transition: 'opacity 0.2s'
                        }}
                        className="contact-menu-btn"
                    />
                </Dropdown>
            </List.Item>
        );
    };

    if (!auth) return null;

    return (
        <>
            {/* Floating Button */}
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
                <Badge count={state.unreadTotal} offset={[-5, 5]}>
                    <Button
                        type="primary"
                        shape="circle"
                        size="large"
                        icon={<MessageOutlined style={{ fontSize: 24 }} />}
                        onClick={() => setDrawerOpen(true)}
                        style={{
                            width: 60, height: 60,
                            background: state.unreadTotal > 0 
                                ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)'
                                : 'linear-gradient(135deg, #0084ff 0%, #0099ff 100%)',
                            border: 'none',
                            boxShadow: state.unreadTotal > 0 
                                ? '0 4px 16px rgba(255, 77, 79, 0.4)'
                                : '0 4px 16px rgba(0, 132, 255, 0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: state.unreadTotal > 0 ? 'pulse 2s infinite' : 'none'
                        }}
                        className="chat-fab-button"
                    />
                </Badge>
            </div>

            {/* Chat Drawer */}
            <Drawer
                title={
                    selectedUser ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Button type="text" icon={<ArrowLeftOutlined />} 
                                onClick={() => { setSelectedUser(null); chatWrapper.setCurChatPerson(null); setShowEmojiPicker(false); dispatch({ type: 'SET_MESSAGES', payload: [] }); }}
                                style={{ marginLeft: -8, color: '#0084ff' }} />
                            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#0084ff', flexShrink: 0 }} />
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {selectedUser.name || selectedUser.vnu_id}
                                </div>
                                <div style={{ fontSize: 12, color: isOtherTyping ? '#0084ff' : '#65676b' }}>
                                    {isOtherTyping ? 'Đang nhập...' : (isSocketConnected ? '● Đang hoạt động' : '○ Offline')}
                                </div>
                            </div>
                            <Popconfirm title="Xóa cuộc trò chuyện?" description="Tất cả tin nhắn sẽ bị xóa vĩnh viễn."
                                onConfirm={() => handleDeleteConversation(selectedUser.vnu_id || selectedUser.student_code)}
                                okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                <Tooltip title="Xóa cuộc trò chuyện">
                                    <Button type="text" icon={<DeleteOutlined />} danger />
                                </Tooltip>
                            </Popconfirm>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MessageOutlined style={{ color: '#0084ff' }} />
                            <span style={{ fontWeight: 600 }}>Tin nhắn</span>
                            {state.unreadTotal > 0 && <Badge count={state.unreadTotal} style={{ marginLeft: 8 }} />}
                        </div>
                    )
                }
                placement="right"
                onClose={() => { setDrawerOpen(false); setSelectedUser(null); chatWrapper.setCurChatPerson(null); setShowEmojiPicker(false); dispatch({ type: 'SET_MESSAGES', payload: [] }); }}
                visible={drawerOpen}
                width={400}
                bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100% - 55px)', background: '#ffffff' }}
                headerStyle={{ borderBottom: '1px solid #e4e6eb', padding: '12px 16px' }}
            >
                {!selectedUser ? (
                    // Contact List View
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ padding: 12, background: '#f0f2f5' }}>
                            <Input
                                placeholder="Tìm kiếm người dùng..."
                                prefix={<SearchOutlined style={{ color: '#65676b' }} />}
                                value={searchText}
                                onChange={(e) => handleSearch(e.target.value)}
                                allowClear
                                style={{ borderRadius: 20, backgroundColor: '#ffffff' }}
                            />
                        </div>
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {searching ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin /></div>
                            ) : contactList.length > 0 ? (
                                <List itemLayout="horizontal" dataSource={contactList} renderItem={renderContactItem} />
                            ) : (
                                <Empty description={<span style={{ color: '#65676b' }}>{searchText ? "Không tìm thấy" : "Chưa có cuộc trò chuyện"}</span>} style={{ marginTop: 48 }} />
                            )}
                        </div>
                    </div>
                ) : (
                    // Chat View
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 4px 12px', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                            {formattedMessages.length > 0 ? (
                                formattedMessages.map((msg, idx) => renderMessageBubble(msg, idx, formattedMessages))
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#65676b', gap: 12 }}>
                                    <Avatar icon={<UserOutlined />} size={64} style={{ backgroundColor: '#0084ff' }} />
                                    <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedUser.name || selectedUser.vnu_id}</div>
                                    <div style={{ fontSize: 13, textAlign: 'center' }}>Bắt đầu cuộc trò chuyện mới</div>
                                </div>
                            )}
                            {isOtherTyping && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ padding: '10px 14px', borderRadius: 18, backgroundColor: '#e4e6eb', display: 'flex', gap: 4 }}>
                                        <span className="typing-dot" style={{ animationDelay: '0ms' }}>•</span>
                                        <span className="typing-dot" style={{ animationDelay: '150ms' }}>•</span>
                                        <span className="typing-dot" style={{ animationDelay: '300ms' }}>•</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} style={{ height: 1 }} />
                        </div>

                        {showEmojiPicker && (
                            <div style={{ padding: '8px 12px', borderTop: '1px solid #e4e6eb', display: 'flex', gap: 8, flexWrap: 'wrap', background: '#f8f9fa' }}>
                                {QUICK_EMOJIS.map(emoji => (
                                    <Button key={emoji} type="text" onClick={() => setMessageText(prev => prev + emoji)} style={{ fontSize: 20, padding: '4px 8px', minWidth: 36 }}>{emoji}</Button>
                                ))}
                            </div>
                        )}

                        <div style={{ padding: '8px 12px 12px 12px', borderTop: '1px solid #e4e6eb', display: 'flex', gap: 8, alignItems: 'flex-end', background: '#ffffff' }}>
                            <Upload accept="image/*" showUploadList={false} beforeUpload={handleImageUpload} disabled={uploading}>
                                <Button type="text" icon={uploading ? <LoadingOutlined /> : <PictureOutlined />} style={{ color: '#0084ff' }} disabled={uploading} />
                            </Upload>
                            <Button type="text" icon={<SmileOutlined />} onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ color: showEmojiPicker ? '#0084ff' : '#65676b' }} />
                            <Input.TextArea
                                placeholder="Aa"
                                value={messageText}
                                onChange={(e) => { setMessageText(e.target.value); emitTyping(); }}
                                onKeyPress={handleKeyPress}
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                style={{ flex: 1, borderRadius: 20, padding: '8px 16px', resize: 'none', fontSize: 14 }}
                            />
                            <Button type="primary" shape="circle" icon={<SendOutlined />} onClick={handleSendMessage} disabled={!messageText.trim()}
                                style={{ background: messageText.trim() ? '#0084ff' : '#e4e6eb', border: 'none', width: 36, height: 36 }} />
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={!!deleteConfirmId}
                title="Xóa cuộc trò chuyện?"
                onOk={() => handleDeleteConversation(deleteConfirmId)}
                onCancel={() => setDeleteConfirmId(null)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
            >
                <p>Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Tất cả tin nhắn sẽ bị xóa vĩnh viễn và không thể khôi phục.</p>
            </Modal>

            {/* Image Preview Modal */}
            <Modal visible={!!previewImage} footer={null} onCancel={() => setPreviewImage(null)} centered width="auto" bodyStyle={{ padding: 0 }}>
                <img src={previewImage} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '80vh' }} />
            </Modal>

            {/* Styles */}
            <style>{`
                .chat-contact-item:hover {
                    background-color: #f0f2f5 !important;
                }
                .chat-contact-item:hover .contact-menu-btn {
                    opacity: 1 !important;
                }
                .contact-menu-btn:hover {
                    opacity: 1 !important;
                    background: #e4e6eb !important;
                }
                .chat-fab-button:hover {
                    transform: scale(1.05);
                }
                .chat-fab-button:active {
                    transform: scale(0.95);
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 77, 79, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
                }
                @keyframes typing-bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-4px); }
                }
                .typing-dot {
                    display: inline-block;
                    animation: typing-bounce 1.2s infinite;
                    color: #65676b;
                    font-size: 20px;
                    line-height: 1;
                }
                .ant-dropdown-menu-item-icon {
                    margin-right: 8px !important;
                }
                .ant-dropdown-menu {
                    border-radius: 8px !important;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
                    padding: 4px 0 !important;
                }
                .ant-dropdown-menu-item {
                    padding: 8px 16px !important;
                    font-size: 14px !important;
                }
                .ant-dropdown-menu-item:hover {
                    background-color: #f5f5f5 !important;
                }
            `}</style>
        </>
    );
}
