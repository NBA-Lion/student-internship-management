import React, { useEffect, useRef, useState, useCallback } from 'react';
import Compose from '../Compose';
import Toolbar from '../Toolbar';
import Message from '../Message';
import moment from 'moment';
import useChatAction from '_actions/chat.action';
import useChatWrapper from '_helpers/chat-wrapper';
import { socketWrapper } from '_helpers/socket-wrapper';
import { API_BASE } from '_helpers/Constant';
import { getUserData } from '_helpers/auth-storage';
import { useParams, useHistory } from 'react-router-dom';
import './MessageList.css';
import axios from 'axios';

// Mã Admin mặc định (sinh viên luôn chat với Admin)
const DEFAULT_ADMIN_ID = 'ADMIN';

export default function MessageList(props) {
  const { vnu_id: urlParamId } = useParams();
  const history = useHistory();
  const [fetchDone, setFetchDone] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [targetName, setTargetName] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messageEnd = useRef(null);
  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const chatAction = useChatAction();
  const chatWrapper = useChatWrapper();

  // CRITICAL: currentUser LUÔN lấy từ auth-storage (theo tab), KHÔNG BAO GIỜ từ URL
  const currentUser = getUserData();
  const currentUserId = currentUser.student_code || currentUser.vnu_id;
  const currentRole = (currentUser.role || '').toLowerCase();

  // partnerId = người còn lại trong cuộc hội thoại (receiverId khi mình gửi)
  // Admin: partnerId = id trên URL (sinh viên đang chat). Student: partnerId = Admin.
  const [partnerId, setPartnerId] = useState(null);

  useEffect(() => {
    if (!currentUserId) return;

    if (currentRole === 'admin') {
      // Admin: id trên URL là sinh viên cần chat
      if (urlParamId) {
        setPartnerId(urlParamId);
      } else {
        setPartnerId(null);
      }
    } else {
      // Student: bỏ qua id trên URL; luôn chat với Admin
      if (urlParamId !== DEFAULT_ADMIN_ID) {
        history.replace(`/chat/${DEFAULT_ADMIN_ID}`);
        return;
      }
      setPartnerId(DEFAULT_ADMIN_ID);
    }
  }, [currentUserId, currentRole, urlParamId, history]);

  // ============================================
  // LOAD CONVERSATION WHEN partnerId (đúng role) THAY ĐỔI
  // ============================================
  useEffect(() => {
    if (!partnerId) return;

    setIsHidden(true);
    setFetchDone(false);

    chatWrapper.setCurChatPerson(partnerId);
    chatWrapper.clearUnreadCount(partnerId);

    chatAction.addContactToList({ vnu_id: partnerId }).then(() => {
      chatAction.getCurChatMessageById(partnerId).then(() => {
        setFetchDone(true);
        setIsHidden(false);
      });
    });

    async function getTargetName() {
      try {
        const res = await axios.get(`${API_BASE}/api/profile/${partnerId}`);
        setTargetName(res.data?.name || res.data?.full_name || "Người dùng");
      } catch (e) {
        console.error("Error fetching target name:", e);
        setTargetName("Người dùng");
      }
    }
    getTargetName();

    return () => {
      chatWrapper.setCurChatPerson(null);
    };
  }, [partnerId]);

  // ============================================
  // CONVERSATION DELETED: bên kia xóa → mình cũng bỏ cuộc hội thoại (redirect /chat)
  // ============================================
  useEffect(() => {
    if (!socketWrapper.socket || !partnerId) return;
    const handleConversationDeleted = (data) => {
      const otherId = data.by || data.with;
      if (otherId === partnerId) {
        chatWrapper.setCurListMessage([]);
        chatWrapper.setCurChatPerson(null);
        history.replace('/chat');
      }
    };
    socketWrapper.socket.on('ConversationDeleted', handleConversationDeleted);
    return () => socketWrapper.socket.off('ConversationDeleted', handleConversationDeleted);
  }, [partnerId, history, chatWrapper]);

  // ============================================
  // SHORT POLLING FALLBACK (Vercel/serverless: Socket.io unreliable)
  // ============================================
  const POLL_INTERVAL_MS = 2000;
  useEffect(() => {
    if (!partnerId || !fetchDone) return;

    const intervalId = setInterval(() => {
      chatAction.getCurChatMessageById(partnerId);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [partnerId, fetchDone]);

  // ============================================
  // FILTER MESSAGES: giữa currentUserId (từ auth) và partnerId
  // ============================================
  const filteredMessages = React.useMemo(() => {
    if (!fetchDone || !chatWrapper.curListMessages || !currentUserId || !partnerId) return [];

    return chatWrapper.curListMessages.filter(msg => {
      const senderId = msg.from?.vnu_id || msg.sender;
      const receiverId = msg.to?.vnu_id || msg.receiver;
      const isRelevant =
        (senderId === currentUserId && receiverId === partnerId) ||
        (senderId === partnerId && receiverId === currentUserId);
      return isRelevant;
    }).map(result => ({
      id: result._id,
      author: result.from?.vnu_id || result.sender,
      message: result.message || result.content,
      timestamp: new Date(result.createdDate || result.createdAt || result.timestamp),
      is_read: !!result.is_read
    }));
  }, [chatWrapper.curListMessages, fetchDone, currentUserId, partnerId]);

  // Cập nhật "đã đọc" khi bên kia đọc tin (hiện 2 tick)
  useEffect(() => {
    if (!socketWrapper.socket || !currentUserId || !partnerId) return;
    const handleMessagesRead = (data) => {
      if (data.by !== partnerId) return;
      chatWrapper.setCurListMessage(prev => {
        const list = prev || [];
        return list.map(m => {
          const sender = m.from?.vnu_id || m.sender;
          const receiver = m.to?.vnu_id || m.receiver;
          if (sender === currentUserId && receiver === partnerId) return { ...m, is_read: true };
          return m;
        });
      });
    };
    socketWrapper.socket.on('MessagesRead', handleMessagesRead);
    return () => socketWrapper.socket.off('MessagesRead', handleMessagesRead);
  }, [currentUserId, partnerId, chatWrapper]);

  // Đang gõ: nhận từ partner và gửi Typing/StopTyping khi mình gõ
  useEffect(() => {
    if (!socketWrapper.socket || !partnerId) return;
    const handleTyping = (data) => { if (data.from === partnerId) setPartnerTyping(true); };
    const handleStopTyping = (data) => { if (data.from === partnerId) setPartnerTyping(false); };
    socketWrapper.socket.on('UserTyping', handleTyping);
    socketWrapper.socket.on('UserStopTyping', handleStopTyping);
    return () => {
      socketWrapper.socket.off('UserTyping', handleTyping);
      socketWrapper.socket.off('UserStopTyping', handleStopTyping);
    };
  }, [partnerId]);

  const emitTyping = useCallback(() => {
    if (!partnerId || !socketWrapper.socket) return;
    socketWrapper.socket.emit('Typing', { to: partnerId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketWrapper.socket.emit('StopTyping', { to: partnerId });
    }, 3000);
  }, [partnerId]);

  useEffect(() => {
    if (!socketWrapper.socket || !partnerId) return;
    const handleMessageDeleted = (data) => {
      if (!data.messageId) return;
      chatWrapper.setCurListMessage(prev => (prev || []).map(m =>
        m._id === data.messageId ? { ...m, message: 'Tin nhắn đã được thu hồi', type: 'recalled', attachment_url: null } : m
      ));
    };
    socketWrapper.socket.on('MessageDeleted', handleMessageDeleted);
    return () => socketWrapper.socket.off('MessageDeleted', handleMessageDeleted);
  }, [partnerId, chatWrapper]);

  useEffect(() => {
    if (!socketWrapper.socket || !partnerId) return;
    const handleMessageUpdated = (data) => {
      if (!data._id || data.message == null) return;
      chatWrapper.setCurListMessage(prev => (prev || []).map(m =>
        m._id === data._id ? { ...m, message: data.message, editedAt: data.editedAt } : m
      ));
    };
    socketWrapper.socket.on('MessageUpdated', handleMessageUpdated);
    return () => socketWrapper.socket.off('MessageUpdated', handleMessageUpdated);
  }, [partnerId, chatWrapper]);

  useEffect(() => {
    if (!socketWrapper.socket || !partnerId) return;
    const handleMessageReaction = (data) => {
      if (!data.messageId || !data.reactions) return;
      chatWrapper.setCurListMessage(prev => (prev || []).map(m =>
        m._id === data.messageId ? { ...m, reactions: data.reactions } : m
      ));
    };
    socketWrapper.socket.on('MessageReaction', handleMessageReaction);
    return () => socketWrapper.socket.off('MessageReaction', handleMessageReaction);
  }, [partnerId, chatWrapper]);

  // ============================================
  // AUTO-SCROLL TO BOTTOM ON NEW MESSAGES
  // ============================================
  const scrollToBottom = useCallback(() => {
    if (messageEnd.current) {
      messageEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages.length, scrollToBottom]);
  // ============================================
  // RENDER MESSAGES WITH PROPER GROUPING
  // ============================================
  const renderMessages = () => {
    const messages = filteredMessages;
    let tempMessages = [];

    for (let i = 0; i < messages.length; i++) {
      const previous = messages[i - 1];
      const current = messages[i];
      const next = messages[i + 1];
      const isMine = current.author === currentUserId;
      const currentMoment = moment(current.timestamp);
      
      let prevBySameAuthor = false;
      let nextBySameAuthor = false;
      let startsSequence = true;
      let endsSequence = true;
      let showTimestamp = true;

      if (previous) {
        const previousMoment = moment(previous.timestamp);
        const previousDuration = moment.duration(currentMoment.diff(previousMoment));
        prevBySameAuthor = previous.author === current.author;
        
        if (prevBySameAuthor && previousDuration.as('hours') < 1) {
          startsSequence = false;
        }
        if (previousDuration.as('hours') < 1) {
          showTimestamp = false;
        }
      }

      if (next) {
        const nextMoment = moment(next.timestamp);
        const nextDuration = moment.duration(nextMoment.diff(currentMoment));
        nextBySameAuthor = next.author === current.author;

        if (nextBySameAuthor && nextDuration.as('hours') < 1) {
          endsSequence = false;
        }
      }

      tempMessages.push(
        <Message
          key={current.id || i}
          isMine={isMine}
          startsSequence={startsSequence}
          endsSequence={endsSequence}
          showTimestamp={showTimestamp}
          isRead={current.is_read}
          data={current}
        />
      );
    }

    return tempMessages;
  };

    return(
      <div className="message-list">
        <Toolbar
          className="conversation-title-toolbar"
          title={partnerTyping ? `${targetName} đang nhập...` : `Trao đổi với ${targetName}`}
        />

        <div  className="message-list-container">{renderMessages()}
          <div style={{ float:"left", clear: "both" }}
              ref={messageEnd}>
          </div>
        </div>
        <Compose onSendMessage={chatAction.onSendMessage} onTyping={emitTyping} visible={!isHidden}/>
        
      </div>
    );
}

 // const getMessages = () => {
  //    var tempMessages = [
  //       {
  //         id: 1,
  //         author: 'apple',
  //         message: 'Hello world! This is a long message that will hopefully get wrapped by our message bubble component! We will see how well it works.',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 2,
  //         author: 'orange',
  //         message: 'It looks like it wraps exactly as it is supposed to. Lets see what a reply looks like!',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 3,
  //         author: 'orange',
  //         message: 'Hello world! This is a long message that will hopefully get wrapped by our message bubble component! We will see how well it works.',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 4,
  //         author: 'apple',
  //         message: 'It looks like it wraps exactly as it is supposed to. Lets see what a reply looks like!',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 5,
  //         author: 'apple',
  //         message: 'Hello world! This is a long message that will hopefully get wrapped by our message bubble component! We will see how well it works.',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 6,
  //         author: 'apple',
  //         message: 'It looks like it wraps exactly as it is supposed to. Lets see what a reply looks like!',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 7,
  //         author: 'orange',
  //         message: 'Hello world! This is a long message that will hopefully get wrapped by our message bubble component! We will see how well it works.',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 8,
  //         author: 'orange',
  //         message: 'It looks like it wraps exactly as it is supposed to. Lets see what a reply looks like!',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 9,
  //         author: 'apple',
  //         message: 'Hello world! This is a long message that will hopefully get wrapped by our message bubble component! We will see how well it works.',
  //         timestamp: new Date().getTime()
  //       },
  //       {
  //         id: 10,
  //         author: 'orange',
  //         message: 'It looks like it wraps exactly as it is supposed to. Lets see what a reply looks like!',
  //         timestamp: new Date().getTime()
  //       },
  //     ]
  // }