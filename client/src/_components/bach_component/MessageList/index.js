import React, { useEffect, useRef, useState, useCallback } from 'react';
import Compose from '../Compose';
import Toolbar from '../Toolbar';
import Message from '../Message';
import moment from 'moment';
import useChatAction from '_actions/chat.action';
import useChatWrapper from '_helpers/chat-wrapper';
import { useParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authAtom } from '_state';
import './MessageList.css';
import axios from 'axios';

export default function MessageList(props) {
  const { vnu_id } = useParams();
  const [fetchDone, setFetchDone] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [targetName, setTargetName] = useState('');
  
  const messageEnd = useRef(null);
  const messageListRef = useRef(null);
  
  const chatAction = useChatAction();
  const chatWrapper = useChatWrapper();
  const auth = useRecoilValue(authAtom);
  
  const currentUserId = auth?.student_code || auth?.vnu_id;
  const NOT_MY_USER_ID = vnu_id;

  // ============================================
  // LOAD CONVERSATION WHEN vnu_id CHANGES
  // ============================================
  useEffect(() => {
    if (!vnu_id) return;

    setIsHidden(true);
    setFetchDone(false);

    // Set active conversation FIRST
    chatWrapper.setCurChatPerson(vnu_id);
    
    // Clear unread count when opening conversation
    chatWrapper.clearUnreadCount(vnu_id);

    // Add contact and load messages
    chatAction.addContactToList({ vnu_id }).then(() => {
      chatAction.getCurChatMessageById(vnu_id).then(() => {
        setFetchDone(true);
        setIsHidden(false);
      });
    });

    // Fetch target user name
    async function getTargetName() {
      try {
        const res = await axios.get('http://localhost:5000/api/profile/' + vnu_id);
        setTargetName(res.data?.name || res.data?.full_name || "Người dùng");
      } catch (e) {
        console.error("Error fetching target name:", e);
        setTargetName("Người dùng");
      }
    }
    getTargetName();

    // Cleanup: clear active conversation on unmount
    return () => {
      chatWrapper.setCurChatPerson(null);
    };
  }, [vnu_id]);

  // ============================================
  // FILTER MESSAGES FOR CURRENT CONVERSATION ONLY
  // Prevent "ghost messages" from other users
  // ============================================
  const filteredMessages = React.useMemo(() => {
    if (!fetchDone || !chatWrapper.curListMessages) return [];
    
    return chatWrapper.curListMessages.filter(msg => {
      const senderId = msg.from?.vnu_id || msg.sender;
      const receiverId = msg.to?.vnu_id || msg.receiver;
      
      // Message must be between current user and the target user
      const isRelevant = 
        (senderId === currentUserId && receiverId === vnu_id) ||
        (senderId === vnu_id && receiverId === currentUserId);
      
      return isRelevant;
    }).map(result => ({
      id: result._id,
      author: result.from?.vnu_id || result.sender,
      message: result.message || result.content,
      timestamp: new Date(result.createdDate || result.createdAt || result.timestamp)
    }));
  }, [chatWrapper.curListMessages, fetchDone, currentUserId, vnu_id]);

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
      const isMine = current.author !== NOT_MY_USER_ID;
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
          title={"Trao đổi với " + targetName}
        />

        <div  className="message-list-container">{renderMessages()}
          <div style={{ float:"left", clear: "both" }}
              ref={messageEnd}>
          </div>
        </div>
        <Compose onSendMessage={chatAction.onSendMessage} visible={!isHidden}/>
        
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