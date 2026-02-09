import { useRecoilState } from 'recoil';
import { alertBachAtom } from '../_state/alert_bach';
import useChatWrapper from '_helpers/chat-wrapper';
import { useAuthWrapper } from '_helpers';
import { socketWrapper } from '_helpers/socket-wrapper';
import { getUserData } from '_helpers/auth-storage';
import { feedPageAtom } from '_state/feed_page';
import { getRecoil, setRecoil } from "recoil-nexus";
import { useFeedPageWrapper } from '_helpers/feed_page_wrapper';
import { 
    waitForUpdateLatestMsgAtom, 
    waitToAddContactAtom, 
    curChatPersonAtom, 
    curListMessagesAtom,
    curListContactAtom,
    unreadCountsAtom 
} from '_state/chat';

// ============================================
// NOTIFICATION QUEUE - Prevent overwriting notifications
// ============================================
let notificationQueue = [];
let isProcessingNotifications = false;

function processNotificationQueue(setAlert) {
    if (isProcessingNotifications || notificationQueue.length === 0) return;
    
    isProcessingNotifications = true;
    const notification = notificationQueue.shift();
    
    setAlert(notification);
    
    // Wait 3 seconds before showing next notification
    setTimeout(() => {
        isProcessingNotifications = false;
        processNotificationQueue(setAlert);
    }, 3000);
}

function queueNotification(notification, setAlert) {
    // Prevent duplicate notifications from same sender within 2 seconds
    const isDuplicate = notificationQueue.some(
        n => n.senderId === notification.senderId && 
             Date.now() - n.timestamp < 2000
    );
    
    if (!isDuplicate) {
        notificationQueue.push({
            ...notification,
            timestamp: Date.now()
        });
        processNotificationQueue(setAlert);
    }
}

// Export function to clear queue on logout
export function clearNotificationQueue() {
    notificationQueue = [];
    isProcessingNotifications = false;
    console.log(">>> [Socket] Notification queue cleared");
}

function useSocketAction() {
    let feedPageWrapper = useFeedPageWrapper();
    let chatWrapper = useChatWrapper();
    let [alert, setAlert] = useRecoilState(alertBachAtom);

    function onConnected() {
        // debugger
        socketWrapper.isConnected = true
    }
    function onNewPost(newPost) {
 
        var feedPageState = getRecoil(feedPageAtom);
        let posts = [...feedPageState.posts];
            posts.push(newPost);
            setRecoil(feedPageAtom, {...feedPageWrapper.feedPageState, posts:posts})
    }
    function onNewComment(newComment) {
        var feedPageState = getRecoil(feedPageAtom);
        feedPageState = JSON.parse(JSON.stringify(feedPageState))
        var new_comment = newComment.new_comment;
        var postId = newComment.postId;
        let posts = [...feedPageState.posts];
        for (var i of posts) {
            if (i._id == postId) {
                var newComments = [...i.comments]
                newComments.push(new_comment);
                i.comments = newComments;
                break;
            }
        }
        setRecoil(feedPageAtom, {...feedPageWrapper.feedPageState, posts:posts})
        // console.log("new comment bro");
    }
    function onUpdatePost(newPost) {
        // debugger
        var feedPageState = getRecoil(feedPageAtom);
        feedPageState = JSON.parse(JSON.stringify(feedPageState))
        var postId = newPost._id;
        let posts = [...feedPageState.posts];
        let newPosts = [];
        for (var i of posts) {
            if (i._id == postId) {
                newPosts.push(newPost)
                continue;
            }
            newPosts.push(i);
        }
        setRecoil(feedPageAtom, {...feedPageWrapper.feedPageState, posts:newPosts})
    }
    function onNewMessage(message) {
        // ============================================
        // CRITICAL: Get current user to verify sender
        // authAtom only contains JWT token, NOT user data
        // We must get user data from localStorage
        // ============================================
        const userData = getUserData();
        const currentUserId = userData?.student_code || userData?.vnu_id;

        // ============================================
        // SECURITY: Extract sender info from server payload
        // NEVER trust client-side data for sender identity
        // ============================================
        const senderId = message.from?.vnu_id || message.from?.id || message.sender;
        const senderName = message.from?.name || "Người dùng";
        const receiverId = message.to?.vnu_id || message.to?.id || message.receiver;
        const messageContent = message.message || message.content || "";

        // ============================================
        // DETERMINE MESSAGE DIRECTION
        // ============================================
        const isFromMe = senderId === currentUserId;
        const isSelfSend = message.selfSend === true || message.isSender === true;
        const isIncomingMessage = !isFromMe && !isSelfSend;

        // The "other person" in this conversation
        const otherUserId = isFromMe ? receiverId : senderId;
        const otherUserName = isFromMe ? (message.to?.name || "Người dùng") : senderName;

        // ============================================
        // GET CURRENT ACTIVE CONVERSATION
        // ============================================
        const activeConversation = getRecoil(curChatPersonAtom);

        console.log(">>> [Socket] NewMessage:", {
            senderId,
            receiverId,
            currentUserId,
            activeConversation,
            isFromMe,
            isSelfSend,
            isIncomingMessage
        });

        // ============================================
        // CASE A: Message belongs to ACTIVE conversation
        // IMMEDIATELY update messages state - NO RELOAD NEEDED
        // ============================================
        const isActiveConversation = 
            otherUserId === activeConversation ||
            senderId === activeConversation ||
            receiverId === activeConversation;

        if (isActiveConversation) {
            const currentMessages = getRecoil(curListMessagesAtom) || [];
            
            // 1) Nếu đã có message với cùng _id thì bỏ qua (so sánh string tránh ObjectId vs string)
            const existsById = currentMessages.some(m => String(m._id) === String(message._id));

            // 2) Nếu có tin nhắn "optimistic" hoặc tin của mình cùng nội dung để thay bằng bản server
            let optimisticIndex = -1;
            if (!existsById) {
                const contentStr = (messageContent || '').toString().trim();
                optimisticIndex = currentMessages.findIndex(m => {
                    const mc = (m.message || m.content || '').toString().trim();
                    return (m._isOptimistic || (isFromMe && (m.sender === senderId || m.from?.vnu_id === senderId))) &&
                        mc === contentStr &&
                        (m.sender === senderId || m.from?.vnu_id === senderId) &&
                        (m.receiver === receiverId || m.to?.vnu_id === receiverId);
                });
            }

            let newMessages = [...currentMessages];

            if (existsById) {
                console.log(">>> [Socket] Skip duplicate message by id:", message._id);
            } else if (optimisticIndex >= 0) {
                // Thay thế bản optimistic bằng bản server trả về
                console.log(">>> [Socket] Replace optimistic message with confirmed one:", {
                    optimisticIndex,
                    messageId: message._id
                });
                newMessages[optimisticIndex] = {
                    ...message,
                    _isOptimistic: false
                };
                setRecoil(curListMessagesAtom, newMessages);
            } else {
                // Fallback: tìm tin cùng nội dung/sender/receiver để thay thế (tránh double)
                const contentStr = (messageContent || '').toString().trim();
                const fallbackIndex = currentMessages.findIndex(m => {
                    const mc = (m.message || m.content || '').toString().trim();
                    return (m._isOptimistic || (isFromMe && (m.sender === senderId || m.from?.vnu_id === senderId))) &&
                        mc === contentStr &&
                        (m.sender === senderId || m.from?.vnu_id === senderId) &&
                        (m.receiver === receiverId || m.to?.vnu_id === receiverId);
                });
                if (fallbackIndex >= 0) {
                    newMessages = currentMessages.map((m, i) => i === fallbackIndex ? { ...message, _isOptimistic: false } : m);
                    setRecoil(curListMessagesAtom, newMessages);
                    console.log(">>> [Socket] Replaced message (fallback) for echo:", message._id);
                } else if (!isFromMe && !isSelfSend) {
                    // Chỉ ADD khi là tin từ người khác — tin của mình (echo) không add để tránh double
                    newMessages = [...currentMessages, message];
                    setRecoil(curListMessagesAtom, newMessages);
                    console.log(">>> [Socket] Added message to active conversation:", { messageId: message._id });
                }
                // Nếu là echo (isFromMe) mà không tìm thấy để replace → bỏ qua, không add (ChatWidget/UI khác đã xử lý)
            }
        }

        // ============================================
        // CASE B: Message is from a DIFFERENT user (Background)
        // Update unread count, don't add to current messages
        // ============================================
        if (isIncomingMessage && !isActiveConversation) {
            // Increment unread count for this sender
            const currentUnreadCounts = getRecoil(unreadCountsAtom) || {};
            const newUnreadCounts = {
                ...currentUnreadCounts,
                [senderId]: (currentUnreadCounts[senderId] || 0) + 1
            };
            setRecoil(unreadCountsAtom, newUnreadCounts);

            console.log(">>> [Socket] Background message - updated unread count:", {
                senderId,
                unreadCount: newUnreadCounts[senderId]
            });
        }

        // ============================================
        // SHOW NOTIFICATION (only for incoming messages)
        // Using queue system to prevent notification overwriting
        // ============================================
        if (isIncomingMessage) {
            // CRITICAL: Double-check sender name from server payload
            const notificationSenderName = message.from?.name || senderName || "Người dùng";
            
            console.log(">>> [Socket] Queueing notification for:", {
                notificationSenderName,
                senderId,
                messageFrom: message.from,
                currentUserId
            });

            // Queue notification instead of direct setAlert
            queueNotification({
                message: `Tin nhắn mới từ: ${notificationSenderName}`,
                description: messageContent.length > 50 
                    ? messageContent.substring(0, 50) + "..." 
                    : messageContent,
                senderId: senderId
            }, setAlert);
        }

        // ============================================
        // UPDATE CONTACT LIST (Latest Message Preview)
        // ============================================
        const currentContacts = getRecoil(curListContactAtom) || [];
        const contactIndex = currentContacts.findIndex(
            c => c.contact?.vnu_id === otherUserId
        );

        if (contactIndex >= 0) {
            // Update existing contact
            const updatedContacts = [...currentContacts];
            updatedContacts[contactIndex] = {
                ...updatedContacts[contactIndex],
                latest_message: {
                    message: messageContent,
                    createdAt: message.createdAt || new Date().toISOString()
                },
                latest_sender: isFromMe ? "isMe" : "notMe"
            };
            setRecoil(curListContactAtom, updatedContacts);
        } else if (isIncomingMessage && message.newContact) {
            // Add new contact to list
            let listToAdd = getRecoil(waitToAddContactAtom) || [];
            listToAdd = [...listToAdd, {
                vnu_id: senderId,
                name: senderName,
                avatar_url: message.from?.avatar_url,
                message: message
            }];
            setRecoil(waitToAddContactAtom, listToAdd);
        }

        // ============================================
        // LEGACY: Update waitForUpdateLatestMsgAtom
        // ============================================
        const newUpdate = {
            vnu_id: otherUserId,
            latest_message: message,
            latest_sender: isFromMe ? "isMe" : "notMe"
        };
        let listUpdating = getRecoil(waitForUpdateLatestMsgAtom) || [];
        listUpdating = [...listUpdating, newUpdate];
        setRecoil(waitForUpdateLatestMsgAtom, listUpdating);
    }
    return {onNewPost, onNewMessage, onConnected, onNewComment, onUpdatePost}
}

export default useSocketAction;

