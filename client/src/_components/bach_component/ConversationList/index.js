import React, { useEffect } from 'react';
import ConversationListItem from '../ConversationListItem';
import Toolbar from '../Toolbar';
import ToolbarButton from '../ToolbarButton';
import './ConversationList.css';
import useChatAction from '_actions/chat.action';
import useChatWrapper from '_helpers/chat-wrapper';
import { Link } from 'react-router-dom';

export default function ConversationList(props) {
  const chatAction = useChatAction();
  const chatWrapper = useChatWrapper();
 
  // Load contacts on mount
  useEffect(() => {
    chatAction.getRecentContact().then(() => {
      props.setLoaded(true);
    });
  }, []);

  // Handle new contacts from socket
  useEffect(() => {
    async function addContact() {
      if (chatWrapper.waitingToAddContact && chatWrapper.waitingToAddContact.length > 0) {
        for (const contact of chatWrapper.waitingToAddContact) {
          await chatAction.addContactToList(contact);
        }
      }
    }

    addContact().then(() => {
      chatWrapper.setWaitingToAddContact(null);
    });
  }, [chatWrapper.waitingToAddContact]);

  // Handle latest message updates
  useEffect(() => {
    if (!chatWrapper.listUpdateLatestMsg) return;
    
    for (const update of chatWrapper.listUpdateLatestMsg) {
      chatAction.updateLatestMsg(update);
    }
    
    // Clear the update list after processing
    chatWrapper.setListUpdateLatestMsg(null);
  }, [chatWrapper.listUpdateLatestMsg]);

  // Build conversations list with unread counts
  const conversationsList = chatWrapper.curListContact 
    ? chatWrapper.curListContact.map(result => ({
        vnu_id: result.contact?.vnu_id,
        name: result.contact?.name || "Người dùng",
        text: result.latest_message?.message || "Chưa có tin nhắn",
        unreadCount: chatWrapper.getUnreadCount(result.contact?.vnu_id)
      }))
    : [];

  return (
    <div className="conversation-list">
      <Toolbar
        title="Nhắn tin"
        leftItems={[
          <ToolbarButton key="cog" icon="ion-ios-cog" />
        ]}
        rightItems={[
          <ToolbarButton key="add" icon="ion-ios-add-circle-outline" />
        ]}
      />
      {conversationsList.map(conversation => (
        <Link to={`/chat/${conversation.vnu_id}`} key={conversation.vnu_id}>
          <ConversationListItem
            data={conversation}
            picked={conversation.vnu_id === chatWrapper.curChatPerson}
            unreadCount={conversation.unreadCount}
          />
        </Link>
      ))}
    </div>
  );
}