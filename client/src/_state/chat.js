import { atom } from 'recoil';

// ============================================
// ACTIVE CONVERSATION STATE
// The user I am currently chatting with
// ============================================
const curChatPersonAtom = atom({
    key: 'curChatPerson',
    default: null, 
});

// ============================================
// MESSAGES STATE
// Array of messages for the active conversation
// ============================================
const curListMessagesAtom = atom({
    key: 'curListMessages',
    default: [],
});

// ============================================
// CONVERSATIONS LIST STATE
// All users I have chatted with (Sidebar)
// Each item: { contact: {...}, latest_message: {...}, unreadCount: 0 }
// ============================================
const curListContactAtom = atom({
    key: 'curListContact',
    default: [],
});

// ============================================
// PENDING ACTIONS
// ============================================
const waitToAddContactAtom = atom({
    key: "waitToAddContact",
    default: null
});

const waitForUpdateLatestMsgAtom = atom({
    key: "waitForUpdateLatestMsg",
    default: null
});

// ============================================
// UNREAD COUNTS MAP
// Map of { [userId]: unreadCount }
// ============================================
const unreadCountsAtom = atom({
    key: "unreadCounts",
    default: {}
});

// ============================================
// TYPING INDICATORS
// Map of { [userId]: boolean }
// ============================================
const typingUsersAtom = atom({
    key: "typingUsers",
    default: {}
});

export { 
    curChatPersonAtom, 
    curListMessagesAtom, 
    curListContactAtom, 
    waitToAddContactAtom, 
    waitForUpdateLatestMsgAtom,
    unreadCountsAtom,
    typingUsersAtom
};