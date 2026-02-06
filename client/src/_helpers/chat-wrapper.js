import { useRecoilState } from 'recoil';
import { useFetchWrapper } from '_helpers';
import { 
    curChatPersonAtom, 
    curListMessagesAtom, 
    curListContactAtom, 
    waitForUpdateLatestMsgAtom,
    waitToAddContactAtom,
    unreadCountsAtom 
} from '../_state/chat';
import { alertBachAtom } from '../_state/alert_bach';

function useChatWrapper() {
    const fetchWrapper = useFetchWrapper();
    
    const [, setAlert] = useRecoilState(alertBachAtom);
    
    const [curChatPerson, setCurChatPerson] = useRecoilState(curChatPersonAtom);
    const [curListMessages, setCurListMessage] = useRecoilState(curListMessagesAtom);
    const [curListContact, setCurListContact] = useRecoilState(curListContactAtom);
    
    const [waitingToAddContact, setWaitingToAddContact] = useRecoilState(waitToAddContactAtom);
    const [listUpdateLatestMsg, setListUpdateLatestMsg] = useRecoilState(waitForUpdateLatestMsgAtom);
    const [unreadCounts, setUnreadCounts] = useRecoilState(unreadCountsAtom);

    // --- 1. LẤY DANH SÁCH LIÊN HỆ GẦN ĐÂY ---
    async function getRecentContact() {
        try {
            // console.log(">>> [Chat] Đang lấy danh sách liên hệ...");
            
            // Server trả về danh sách trong res.data
            let res = await fetchWrapper.get("/api/chat/recent-contacts");
            
            if (res && (res.status === "Success" || res.ok)) {
                // Kiểm tra nếu response chưa được parse JSON thì parse
                if (typeof res.json === 'function') {
                    res = await res.json();
                }

                // console.log(">>> [Chat] Danh sách liên hệ:", res.data);
                
                // Ưu tiên lấy .data, nếu không có thì lấy .message
                setCurListContact(res.data || res.message || []);
            }
            return res;
        } catch (e) {
            console.error(e);
            setAlert({message: "Lỗi tải danh sách chat", description: e.toString()});
        }
    }

    // --- 2. LẤY TIN NHẮN CỦA MỘT NGƯỜI ---
    async function fetchCurListMessageById(student_code) {
        if (!student_code) return;

        try {
            // Chỉ xóa khi chuyển sang cuộc hội thoại KHÁC. Khi polling (cùng conversation) không xóa — tránh tin nhắn "biến mất" trước khi API trả về
            if (curChatPerson !== student_code) {
                setCurListMessage([]);
            }

            let res = await fetchWrapper.get(`/api/chat/messages/${student_code}`);
            
            if (res && (res.status === "Success" || res.ok)) {
                if (typeof res.json === 'function') {
                    res = await res.json();
                }

                const serverList = res.data || res.message || [];
                const serverIds = new Set(serverList.map((m) => m._id));
                const inConv = (m) => {
                    const s = m.from?.vnu_id || m.sender;
                    const r = m.to?.vnu_id || m.receiver;
                    return (s === student_code || r === student_code);
                };
                // Tránh giữ optimistic nếu đã có tin trùng từ server (cùng sender, receiver, nội dung)
                const serverContentKey = (m) => `${m.sender}|${m.receiver}|${(m.message || m.content || '').trim()}`;
                const serverContentKeys = new Set(serverList.map(serverContentKey));
                setCurChatPerson(student_code);
                setCurListMessage((prev) => {
                    const current = prev || [];
                    const keep = current.filter((m) => {
                        if (!inConv(m) || serverIds.has(m._id)) return false;
                        if (m._isOptimistic && serverContentKeys.has(`${m.sender}|${m.receiver}|${(m.message || m.content || '').trim()}`)) return false;
                        return true;
                    });
                    const merged = [...serverList, ...keep].sort(
                        (a, b) => new Date(a.createdAt || a.createdDate || 0) - new Date(b.createdAt || b.createdDate || 0)
                    );
                    return merged;
                });
                clearUnreadCount(student_code);
            }
            
            return res;
        } catch (e) {
            console.error(e);
            setAlert({message: "Lỗi tải tin nhắn", description: e.toString()});
        }
    }

    // --- 3. CLEAR UNREAD COUNT ---
    function clearUnreadCount(userId) {
        if (!userId) return;
        setUnreadCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[userId];
            return newCounts;
        });
    }

    // --- 4. GET UNREAD COUNT FOR A USER ---
    function getUnreadCount(userId) {
        return unreadCounts[userId] || 0;
    }

    return {
        curListContact,
        setCurListContact,
        getRecentContact,
        
        curChatPerson,
        setCurChatPerson,
        
        curListMessages,
        setCurListMessage,
        fetchCurListMessageById,
        
        curChatPersonAtom,
        curListMessagesAtom,
        curListContactAtom,
        
        waitToAddContactAtom,
        waitingToAddContact,
        setWaitingToAddContact,
        
        listUpdateLatestMsg,
        setListUpdateLatestMsg,
        waitForUpdateLatestMsgAtom,
        
        // Unread counts
        unreadCounts,
        setUnreadCounts,
        clearUnreadCount,
        getUnreadCount
    };
}

export default useChatWrapper;