import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { Badge, Button, Drawer, Input, List, Avatar, Spin, Empty, Popconfirm, Modal, Upload, Tooltip, message, Dropdown, Menu } from 'antd';
import { 
    MessageOutlined, SendOutlined, SearchOutlined, UserOutlined, ArrowLeftOutlined,
    DeleteOutlined, PictureOutlined, SmileOutlined, CheckOutlined, LoadingOutlined,
    MoreOutlined, PushpinOutlined, InboxOutlined, BellOutlined, StopOutlined,
    EyeInvisibleOutlined, PaperClipOutlined, FilePdfOutlined
} from '@ant-design/icons';
import { useRecoilValue, useRecoilState } from 'recoil';
import { authAtom } from '_state';
import { socketConnected } from '_state/socket';
import useChatWrapper from '_helpers/chat-wrapper';
import useChatAction from '_actions/chat.action';
import { socketWrapper } from '_helpers/socket-wrapper';
import { API_BASE } from '_helpers/Constant';
import { getUserData } from '_helpers/auth-storage';
import './Chat.css';

// ============================================
// CONSTANTS
// ============================================
const CHAT_MUTED_KEY = 'chat_muted_partners';
function getMutedPartners() {
  try {
    const raw = localStorage.getItem(CHAT_MUTED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}
function setMutedPartner(partnerId, muted) {
  const o = getMutedPartners();
  if (muted) o[partnerId] = true; else delete o[partnerId];
  localStorage.setItem(CHAT_MUTED_KEY, JSON.stringify(o));
  return o;
}

const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2AhYaHiIaGhYSEgoGAf39/f39/gIGBgoODhIWFhYWFhYSEg4KBgH9/fn5+fn5/f4CBgoOEhIWFhYWEhIOCgYF/fn5+fn5+f4CAgYKDhISEhISEg4OCgYB/fn59fX5+fn+AgIGCg4OEhISEg4OCgYB/fn59fX5+fn+AgIGCgoODg4ODg4KBgH9+fX19fn5+f4CAgYKCg4ODg4OCgYGAf359fX19fn5/f4CAgYKCg4ODg4KCgYB/fn19fX19fn5/f4CAgYGCgoKCgoKBgH9+fX19fX5+fn+AgICBgYKCgoKCgYB/f359fX19fn5+f3+AgIGBgoKCgoGBgH9+fn19fX1+fn5/f4CAgYGBgYGBgYB/f359fX19fn5+fn9/gICAgYGBgYGAf39+fn19fX1+fn5+f3+AgICBgYGBgIB/f359fX19fX5+fn5/f4CAgICAgICAgH9/fn59fX19fX5+fn9/f4CAgICAgIB/f39+fn19fX19fn5+fn9/f4CAgICAgH9/f359fX19fX19fn5+fn9/f4CAgICAgH9/fn5+fX19fX19fn5+fn9/f39/f39/f39+fn59fX19fX19fn5+fn9/f39/f39/f35+fn59fX19fX19fn5+fn5/f39/f39/f35+fn59fX19fX19fX5+fn5+f39/f39/f35+fn59fX19fX19fX5+fn5+fn9/f39/f35+fn59fX19fX19fX5+fn5+fn5/f39/f35+fn59fX19fX19fX5+fn5+fn5/f39/f39+fn59fX19fX19fX5+fn5+fn5+f39/f39+fn59fX19fX19fX1+fn5+fn5+fn9/f39+fn59fX19fX19fX1+fn5+fn5+fn5/f39+fn59fX19fX19fX1+fn5+fn5+fn5+f39+fn59fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fn5+fn5+fn5+fn5+fn5+fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn19fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn19fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX19fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn5+fn59fX19fX19fX19fX5+fn5+fn5+fn5+fn5+fn59fX19fX19fX1+fn5+fn5+fn5+fn5+fn5+fX19fX19fX19fn5+fn5+fn5+fn5+fn5+fn59fX19fX19fn5+fn5+fn5+fn5+fn5+fn5+fn59fX19fn5+fn5+fn5+fn5+fn5+fn5+fn59fX5+fn5+fn5+fn5+fn5+fn5+fn5+fn59fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5';
const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '😊', '👍', '❤️', '🔥', '👏', '🎉', '😢', '😮'];

// Chuẩn hóa _id (string hoặc ObjectId) thành string — tránh "[object Object]" khi gọi API / so sánh
function normMessageId(x) {
  if (x == null) return x;
  if (typeof x === 'string') return x;
  if (typeof x === 'object' && typeof x.toString === 'function') return x.toString();
  return String(x);
}

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
        
        case 'SET_MESSAGES': {
            const list = (action.payload || []).map(m => ({ ...m, _id: normMessageId(m._id) }));
            return { ...state, currentMessages: list };
        }

        // Chỉ dùng khi nhận echo tin CỦA MÌNH từ server: thay optimistic bằng bản server, KHÔNG BAO GIỜ thêm mới → tránh double
        case 'REPLACE_OPTIMISTIC_WITH_SERVER': {
            const { serverMessage, partnerId, myId } = action.payload;
            const list = [...state.currentMessages];
            const contentStr = (serverMessage.message || serverMessage.content || '').toString().trim();
            let idx = -1;
            for (let i = list.length - 1; i >= 0; i--) {
                const m = list[i];
                const fromMe = (m.from?.vnu_id || m.sender) === myId;
                const sameContent = (m.message || m.content || '').toString().trim() === contentStr;
                if (fromMe && (m._isOptimistic || sameContent)) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                list[idx] = { ...serverMessage, _isOptimistic: false };
            }
            // Khi idx < 0: KHÔNG push — tránh double. Chỉ giữ optimistic đã hiển thị.
            const otherUserId = (serverMessage.from?.vnu_id || serverMessage.sender) === myId
                ? (serverMessage.to?.vnu_id || serverMessage.receiver)
                : (serverMessage.from?.vnu_id || serverMessage.sender);
            let newConversations = [...state.conversations];
            const convIndex = newConversations.findIndex(c =>
                c.partner_id === otherUserId || c.partner?.vnu_id === otherUserId || c.partner?.student_code === otherUserId
            );
            if (convIndex >= 0) {
                const conv = { ...newConversations[convIndex] };
                conv.last_message = {
                    _id: serverMessage._id,
                    message: serverMessage.message,
                    type: serverMessage.type,
                    sender: serverMessage.from?.vnu_id || serverMessage.sender,
                    is_mine: true,
                    createdAt: serverMessage.createdAt
                };
                conv.timestamp = serverMessage.createdAt;
                newConversations.splice(convIndex, 1);
                newConversations.unshift(conv);
            }
            return { ...state, currentMessages: list, conversations: newConversations };
        }
        
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
                const contentStr = (message.message || message.content || '').toString().trim();
                const existsById = newMessages.some(m => String(m._id) === String(message._id));
                const isOptimisticPayload = !!message._isOptimistic;

                // Nếu đang thêm optimistic nhưng đã có tin từ mình cùng nội dung (server echo tới trước) → bỏ qua, tránh double
                const alreadyHaveSameFromMe = isOptimisticPayload && contentStr && newMessages.some(m => 
                    (m.from?.vnu_id || m.sender) === myId && 
                    (m.message || m.content || '').toString().trim() === contentStr && 
                    !m._isOptimistic
                );

                if (!alreadyHaveSameFromMe) {
                    const optimisticIndex = isMyMessage ? newMessages.findIndex(m => 
                        m._isOptimistic && (m.message || m.content || '').toString().trim() === contentStr
                    ) : -1;
                    const contentDupIndex = isMyMessage && optimisticIndex < 0 ? newMessages.findIndex(m => {
                        const fromMe = (m.from?.vnu_id || m.sender) === myId;
                        return fromMe && (m.message || m.content || '').toString().trim() === contentStr;
                    }) : -1;
                    let lastMySameIndex = -1;
                    if (isMyMessage && optimisticIndex < 0 && contentDupIndex < 0) {
                        for (let i = newMessages.length - 1; i >= 0; i--) {
                            const m = newMessages[i];
                            if ((m.from?.vnu_id || m.sender) === myId && (m.message || m.content || '').toString().trim() === contentStr) {
                                lastMySameIndex = i;
                                break;
                            }
                        }
                    }

                    const normalizedMsg = (msg) => ({ ...msg, _id: normMessageId(msg._id) });
                    if (existsById) {
                        // skip add
                    } else if (optimisticIndex >= 0) {
                        newMessages[optimisticIndex] = normalizedMsg({ ...message, _isOptimistic: false });
                    } else if (contentDupIndex >= 0) {
                        newMessages[contentDupIndex] = normalizedMsg({ ...message, _isOptimistic: false });
                    } else if (lastMySameIndex >= 0) {
                        newMessages[lastMySameIndex] = normalizedMsg({ ...message, _isOptimistic: false });
                    } else if (isMyMessage) {
                        const lastFromMeIndex = newMessages.map((m, i) => ((m.from?.vnu_id || m.sender) === myId ? i : -1)).filter(i => i >= 0).pop();
                        if (lastFromMeIndex !== undefined && lastFromMeIndex >= 0) {
                            newMessages[lastFromMeIndex] = normalizedMsg({ ...message, _isOptimistic: false });
                        } else {
                            newMessages = [...newMessages, normalizedMsg(message)];
                        }
                    } else {
                        newMessages = [...newMessages, normalizedMsg(message)];
                    }
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

        case 'UPDATE_MESSAGES_READ': {
            const { partnerId, myId } = action.payload;
            const newMessages = state.currentMessages.map(m => {
                const sender = m.from?.vnu_id || m.sender;
                const receiver = m.to?.vnu_id || m.receiver;
                if (sender === myId && receiver === partnerId) return { ...m, is_read: true };
                return m;
            });
            return { ...state, currentMessages: newMessages };
        }

        case 'RECALL_MESSAGE': {
            const { messageId } = action.payload;
            const newMessages = state.currentMessages.map(m =>
                String(m._id) === String(messageId) ? { ...m, message: "Tin nhắn đã được thu hồi", type: "recalled", attachment_url: null } : m
            );
            return { ...state, currentMessages: newMessages };
        }

        case 'EDIT_MESSAGE': {
            const { messageId, message: newText, editedAt } = action.payload;
            const newMessages = state.currentMessages.map(m =>
                String(m._id) === String(messageId) ? { ...m, message: newText, editedAt } : m
            );
            return { ...state, currentMessages: newMessages };
        }

        case 'UPDATE_MESSAGE_REACTIONS': {
            const { messageId, reactions } = action.payload;
            const newMessages = state.currentMessages.map(m =>
                String(m._id) === String(messageId) ? { ...m, reactions: reactions || [] } : m
            );
            return { ...state, currentMessages: newMessages };
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
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [searchInChat, setSearchInChat] = useState('');
    const [mutedPartners, setMutedPartners] = useState(getMutedPartners);
    const [lastTypingTime, setLastTypingTime] = useState(0);
    
    // Menu state
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    // Chỉ hiện Sửa / Thu hồi / reaction khi bấm vào tin nhắn
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    
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
    const lastSentRef = useRef({ text: '', time: 0 });

    useEffect(() => { drawerOpenRef.current = drawerOpen; }, [drawerOpen]);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
    useEffect(() => { stateRef.current = state; }, [state]);
    
    const chatWrapper = useChatWrapper();

    // Current user info
    const currentUser = getUserData();
    const myStudentCode = currentUser.student_code || currentUser.vnu_id || '';

    // ============================================
    // CLICK OUTSIDE TO CLOSE MENU
    // ============================================
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeMenuId && menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
            if (selectedMessageId && !event.target.closest('.chat-bubble-row')) {
                setSelectedMessageId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId, selectedMessageId]);

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
            // Tin của chính mình: senderId trùng currentUser (myStudentCode) hoặc server gửi selfSend/isSender
            const isMyMessage = msg.selfSend === true || msg.isSender === true || senderId === myStudentCode;
            const currentSelectedId = selectedUserRef.current?.vnu_id || selectedUserRef.current?.student_code;

            // ============================================
            // Tin của chính mình (echo từ server): CHỈ add 1 lần từ server — không dùng optimistic nữa
            // ============================================
            if (isMyMessage) {
                const forCurrentChat = (msg.to?.vnu_id || msg.receiver) === currentSelectedId || (msg.from?.vnu_id || msg.sender) === myStudentCode;
                if (forCurrentChat) {
                    dispatch({
                        type: 'ADD_MESSAGE',
                        payload: { message: { ...msg, selfSend: true, isSender: true }, partnerId: currentSelectedId, myId: myStudentCode }
                    });
                    setTimeout(() => {
                        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                }
                return;
            }

            // Từ đây trở đi: chỉ tin từ người khác (senderId !== currentUser)
            const isFromCurrentPartner = senderId === currentSelectedId;
            const isToCurrentPartner = receiverId === currentSelectedId;

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

            // Play notification sound and show desktop notification (trừ khi đã tắt thông báo cuộc chat này)
            if (!drawerOpenRef.current || currentSelectedId !== senderId) {
                if (!mutedPartners[senderId]) {
                    playNotificationSound();
                    if (Notification.permission === 'granted') {
                        new Notification(`Tin nhắn từ ${msg.from?.name || 'Người dùng'}`, {
                            body: msg.type === 'image' ? '📷 Đã gửi một hình ảnh' : msg.message,
                            icon: '/favicon.ico',
                            tag: `chat-${senderId}`
                    });
                    }
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

        const handleMessagesRead = (data) => {
            if (data.by) dispatch({ type: 'UPDATE_MESSAGES_READ', payload: { partnerId: data.by, myId: myStudentCode } });
        };

        const handleMessageDeleted = (data) => {
            if (data.messageId) dispatch({ type: 'RECALL_MESSAGE', payload: { messageId: data.messageId } });
        };

        const handleMessageUpdated = (data) => {
            if (data._id && data.message != null) dispatch({ type: 'EDIT_MESSAGE', payload: { messageId: data._id, message: data.message, editedAt: data.editedAt } });
        };

        const handleMessageReaction = (data) => {
            if (data.messageId && data.reactions) dispatch({ type: 'UPDATE_MESSAGE_REACTIONS', payload: { messageId: data.messageId, reactions: data.reactions } });
        };

        socket.on('UserTyping', handleTyping);
        socket.on('UserStopTyping', handleStopTyping);
        // NewMessage: tin của mình chỉ replace optimistic (handleNewMessage return sớm), tin người khác mới add
        socket.on('NewMessage', handleNewMessage);
        socket.on('ConversationDeleted', handleConversationDeleted);
        socket.on('MessagesRead', handleMessagesRead);
        socket.on('MessageDeleted', handleMessageDeleted);
        socket.on('MessageUpdated', handleMessageUpdated);
        socket.on('MessageReaction', handleMessageReaction);

        return () => {
            socket.off('UserTyping', handleTyping);
            socket.off('UserStopTyping', handleStopTyping);
            socket.off('NewMessage', handleNewMessage);
            socket.off('ConversationDeleted', handleConversationDeleted);
            socket.off('MessagesRead', handleMessagesRead);
            socket.off('MessageDeleted', handleMessageDeleted);
            socket.off('MessageUpdated', handleMessageUpdated);
            socket.off('MessageReaction', handleMessageReaction);
        };
    }, [myStudentCode, playNotificationSound, mutedPartners]);

    useEffect(() => {
        if (Notification.permission === 'default') Notification.requestPermission();
    }, []);

    // ============================================
    // AUTO-SCROLL
    // ============================================
    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior });
    }, []);

    // Không scroll mỗi khi currentMessages thay đổi (polling sẽ kéo xuống mất xem tin cũ). Chỉ scroll khi đổi cuộc chat hoặc khi gửi/nhận tin (xử lý ở từng handler).
    useEffect(() => {
        if (selectedUser) setTimeout(() => scrollToBottom('smooth'), 200);
    }, [selectedUser?.vnu_id, selectedUser?.student_code]);

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

    const handleSendMessage = useCallback(async () => {
        if (!messageText.trim() || !selectedUser) return;
        const userId = selectedUser.vnu_id || selectedUser.student_code;
        const trimmedMessage = messageText.trim();
        // Chặn gửi trùng trong 800ms (double-click / double Enter)
        if (lastSentRef.current.text === trimmedMessage && Date.now() - lastSentRef.current.time < 800) return;
        lastSentRef.current = { text: trimmedMessage, time: Date.now() };
        const socketReady = socketWrapper.socket && socketWrapper.socket.connected;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Socket: KHÔNG dùng optimistic — chỉ thêm tin khi nhận echo từ server → tránh double dứt điểm
        if (socketReady) {
            setMessageText('');
            setShowEmojiPicker(false);
            socketWrapper.socket.emit('StopTyping', { to: userId });
            socketWrapper.socket.emit('NewMessage', { to: userId, message: trimmedMessage, tempId });
            setTimeout(() => scrollToBottom(), 50);
            return;
        }

        // Fallback HTTP khi socket không kết nối (user mới / Vercel)
        setMessageText('');
        setShowEmojiPicker(false);
        try {
            const response = await fetch(`${API_BASE}/api/chat/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` },
                body: JSON.stringify({ to: userId, message: trimmedMessage, type: 'text' }),
            });
            const data = await response.json();
            if (data.status === 'Success' && data.data) {
                dispatch({ type: 'ADD_MESSAGE', payload: { message: { ...data.data, isSender: true, selfSend: true }, partnerId: userId, myId: myStudentCode } });
            } else {
                message.error(data.message || 'Không gửi được tin nhắn');
            }
        } catch (err) {
            message.error('Lỗi kết nối. Thử lại.');
        }
        setTimeout(() => scrollToBottom(), 50);
    }, [messageText, selectedUser, scrollToBottom, myStudentCode, currentUser, auth]);

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
            case 'mute': {
                const next = setMutedPartner(partnerId, !mutedPartners[partnerId]);
                setMutedPartners({ ...next });
                message.success(next[partnerId] ? '🔕 Đã tắt thông báo cuộc chat này' : '🔔 Đã bật thông báo');
                break;
            }
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
    }, [mutedPartners]);

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

    const handleFileUpload = useCallback(async (file) => {
        if (!selectedUser) return false;
        const userId = selectedUser.vnu_id || selectedUser.student_code;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('to', userId);
        try {
            const response = await fetch(`${API_BASE}/api/chat/upload-file`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${auth}` },
                body: formData
            });
            const data = await response.json();
            if (data.status === 'Success' && data.data) {
                dispatch({ type: 'ADD_MESSAGE', payload: { message: { ...data.data, isSender: true, selfSend: true }, partnerId: userId, myId: myStudentCode } });
            } else {
                message.error(data.message || 'Lỗi tải file');
            }
        } catch (err) {
            message.error('Lỗi kết nối');
        } finally {
            setUploading(false);
        }
        return false;
    }, [selectedUser, auth]);

    const [recallLoadingId, setRecallLoadingId] = useState(null);
    const [editLoading, setEditLoading] = useState(false);

    const handleRecallMessage = useCallback(async (messageId) => {
        const idStr = normMessageId(messageId);
        if (!idStr || idStr.startsWith('temp_') || idStr === '[object Object]') {
            message.warning('Vui lòng đợi tin nhắn được gửi xong');
            return;
        }
        setRecallLoadingId(idStr);
        try {
            const res = await fetch(`${API_BASE}/api/chat/message/${idStr}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${auth}` } });
            const data = await res.json();
            if (data.status === 'Success') {
                dispatch({ type: 'RECALL_MESSAGE', payload: { messageId: idStr } });
                setSelectedMessageId(null);
            } else {
                message.error(data.message || 'Không thể thu hồi');
            }
        } catch (err) {
            message.error('Lỗi kết nối');
        } finally {
            setRecallLoadingId(null);
        }
    }, [auth]);

    const handleEditMessage = useCallback(async (messageId, newText) => {
        const idStr = String(messageId);
        if (idStr.startsWith('temp_')) {
            message.warning('Vui lòng đợi tin nhắn được gửi xong');
            return;
        }
        setEditLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/chat/message/${idStr}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` },
                body: JSON.stringify({ message: newText })
            });
            const data = await res.json();
            if (data.status === 'Success' && data.data) {
                dispatch({ type: 'EDIT_MESSAGE', payload: { messageId: idStr, message: data.data.message, editedAt: data.data.editedAt } });
                setEditingMessageId(null);
                setEditingText('');
                setSelectedMessageId(null);
            } else {
                message.error(data.message || 'Không thể sửa');
            }
        } catch (err) {
            message.error('Lỗi kết nối');
        } finally {
            setEditLoading(false);
        }
    }, [auth]);

    const openEditModal = (id, text) => { setEditingMessageId(id); setEditingText(text || ''); };

    const REACTION_EMOJIS = ['👍', '❤️', '😢', '🔥', '👏'];
    const handleReaction = useCallback(async (messageId, emoji) => {
        if (String(messageId).startsWith('temp_')) {
            message.warning('Vui lòng đợi tin nhắn được gửi xong');
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/chat/message/${messageId}/reaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` },
                body: JSON.stringify({ emoji })
            });
            const data = await res.json();
            if (data.status === 'Success' && data.data) dispatch({ type: 'UPDATE_MESSAGE_REACTIONS', payload: { messageId: data.data.messageId, reactions: data.data.reactions } });
        } catch (_) {}
    }, [auth]);

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
                id: normMessageId(msg._id),
                text: msg.message,
                type: msg.type || 'text',
                attachment_url: msg.attachment_url,
                isMine,
                senderId,
                senderName: msg.from?.name || senderId,
                time,
                timestamp,
                is_read: msg.is_read,
                editedAt: msg.editedAt,
                reactions: msg.reactions || []
            };
        });
    }, [state.currentMessages, myStudentCode]);

    const formattedMessages = formatMessages();
    const messagesToShow = searchInChat.trim()
        ? formattedMessages.filter(m => (m.text || '').toLowerCase().includes(searchInChat.trim().toLowerCase()))
        : formattedMessages;
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
        const { isMine, text, time, id, type, attachment_url, editedAt, reactions = [] } = msg;
        const reactionGroups = reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {});
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

        const fileUrl = attachment_url ? `${API_BASE}${attachment_url}` : null;
        const isSelected = selectedMessageId === (id || msg._id);
        const toggleSelect = (e) => {
            if (e.target.closest('.chat-recall-link, .chat-reaction-chip, .chat-reaction-btn, .ant-popover')) return;
            setSelectedMessageId(prev => (prev === (id || msg._id) ? null : (id || msg._id)));
        };
        return (
            <div key={id || idx} className="chat-bubble-row" style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: isLastInSequence ? 10 : 3 }}>
                {type === 'image' && fileUrl ? (
                    <div className="chat-bubble chat-bubble-image" style={{ maxWidth: '75%', ...getBorderRadius(), overflow: 'hidden', cursor: 'pointer' }}
                         onClick={(e) => { e.stopPropagation(); if (isSelected) setPreviewImage(fileUrl); else toggleSelect(e); }}>
                        <img src={fileUrl} alt="Sent" style={{ maxWidth: '100%', maxHeight: 220, display: 'block', borderRadius: 'inherit' }} />
                    </div>
                ) : type === 'file' && fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`} style={{ maxWidth: '75%', padding: '12px 16px', ...getBorderRadius(), wordBreak: 'break-word', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
                        <FilePdfOutlined style={{ fontSize: 20 }} />
                        <span className="chat-bubble-text">{text}</span>
                    </a>
                ) : (
                    <div className={`chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'} ${type === 'recalled' ? 'chat-bubble-recalled' : ''}`} style={{ maxWidth: '75%', padding: '12px 16px', ...getBorderRadius(), wordBreak: 'break-word', cursor: 'pointer' }} onClick={toggleSelect} title="Bấm để xem Sửa / Thu hồi / Reaction">
                        <div className="chat-bubble-text">{text}</div>
                        {editedAt && <div className="chat-edited-label">Đã chỉnh sửa</div>}
                    </div>
                )}
                {isSelected && (
                    <>
                        {isMine && type !== 'recalled' && (
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                                {(type === 'text' || !type) && (
                                    <span className="chat-recall-link" onClick={(e) => { e.stopPropagation(); openEditModal(id, text); }} role="button" tabIndex={0}>Sửa</span>
                                )}
                                <Popconfirm title="Thu hồi tin nhắn?" onConfirm={() => handleRecallMessage(id)} okText="Thu hồi" cancelText="Hủy">
                                    <span className="chat-recall-link" onClick={(e) => e.stopPropagation()} role="button" tabIndex={0}>
                                        {recallLoadingId === String(id) ? <LoadingOutlined spin style={{ marginRight: 4 }} /> : null}
                                        Thu hồi
                                    </span>
                                </Popconfirm>
                            </span>
                        )}
                        {(reactionGroups && Object.keys(reactionGroups).length > 0) && (
                            <div className="chat-reactions-wrap" style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {Object.entries(reactionGroups).map(([emoji, count]) => (
                                    <span key={emoji} className="chat-reaction-chip" onClick={() => handleReaction(id, emoji)} title="Bấm để bỏ reaction">
                                        {emoji} {count > 1 ? count : ''}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            {REACTION_EMOJIS.map(emoji => (
                                <span key={emoji} className="chat-reaction-btn" onClick={() => handleReaction(id, emoji)}>{emoji}</span>
                            ))}
                        </div>
                    </>
                )}
                {isLastInSequence && time && (
                    <div className="chat-bubble-meta">
                        {time}
                        {isMine && (
                            msg.is_read
                                ? <span className="chat-ticks read" title="Đã đọc"><CheckOutlined style={{ fontSize: 10 }} /><CheckOutlined style={{ fontSize: 10, marginLeft: -6 }} /></span>
                                : <span className="chat-ticks sent" title="Đã gửi"><CheckOutlined style={{ fontSize: 10 }} /></span>
                        )}
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
                    {mutedPartners[partnerId] ? 'Bật thông báo' : 'Tắt thông báo'}
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
                className="chat-drawer"
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
                                    {isOtherTyping ? `${selectedUser.name || 'Người dùng'} đang nhập...` : (isSocketConnected ? '● Đang hoạt động' : '○ Offline')}
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
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e4e6eb', background: '#f8f9fa' }}>
                            <Input placeholder="Tìm trong cuộc trò chuyện..." prefix={<SearchOutlined style={{ color: '#8a8d91' }} />}
                                value={searchInChat} onChange={(e) => setSearchInChat(e.target.value)}
                                allowClear style={{ borderRadius: 20 }} />
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 4px 12px', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                            {messagesToShow.length > 0 ? (
                                messagesToShow.map((msg, idx) => renderMessageBubble(msg, idx, messagesToShow))
                            ) : formattedMessages.length > 0 ? (
                                <div style={{ padding: 12, color: '#65676b', textAlign: 'center' }}>Không có tin nhắn nào khớp &quot;{searchInChat}&quot;</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#65676b', gap: 12 }}>
                                    <Avatar icon={<UserOutlined />} size={64} style={{ backgroundColor: '#0084ff' }} />
                                    <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedUser.name || selectedUser.vnu_id}</div>
                                    <div style={{ fontSize: 13, textAlign: 'center' }}>Bắt đầu cuộc trò chuyện mới</div>
                                </div>
                            )}
                            {isOtherTyping && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div className="chat-typing-bubble" style={{ padding: '10px 14px', borderRadius: 18, backgroundColor: '#e4e6eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="typing-dot" style={{ animationDelay: '0ms' }}>•</span>
                                        <span className="typing-dot" style={{ animationDelay: '150ms' }}>•</span>
                                        <span className="typing-dot" style={{ animationDelay: '300ms' }}>•</span>
                                        <span style={{ fontSize: 12, color: '#65676b', marginLeft: 2 }}>đang gõ</span>
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

                        <div className="chat-compose-wrap" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <Upload accept="image/*" showUploadList={false} beforeUpload={handleImageUpload} disabled={uploading}>
                                <Tooltip title="Gửi ảnh"><Button type="text" icon={uploading ? <LoadingOutlined /> : <PictureOutlined />} style={{ color: '#0084ff' }} disabled={uploading} /></Tooltip>
                            </Upload>
                            <Upload accept=".pdf,.doc,.docx,image/*" showUploadList={false} beforeUpload={handleFileUpload} disabled={uploading}>
                                <Tooltip title="Gửi file (PDF, Word)"><Button type="text" icon={<PaperClipOutlined />} style={{ color: '#0084ff' }} disabled={uploading} /></Tooltip>
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

            {/* Edit Message Modal */}
            <Modal
                title="Sửa tin nhắn"
                open={!!editingMessageId}
                onOk={() => editingMessageId && editingText.trim() && handleEditMessage(editingMessageId, editingText.trim())}
                onCancel={() => { setEditingMessageId(null); setEditingText(''); }}
                okText="Lưu"
                cancelText="Hủy"
                destroyOnClose
                confirmLoading={editLoading}
            >
                <Input.TextArea rows={4} value={editingText} onChange={(e) => setEditingText(e.target.value)} placeholder="Nội dung tin nhắn" />
            </Modal>

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
