import { useRecoilState } from 'recoil';
import { useFetchWrapper } from '_helpers';
// import * as Configs from './Constant'; 
import { curChatPersonAtom, curListMessagesAtom, curListContactAtom, waitForUpdateLatestMsgAtom } from '../_state/chat';
import { alertBachAtom } from '../_state/alert_bach';
import { waitToAddContactAtom } from '../_state/chat';

function useChatWrapper() {
    const fetchWrapper = useFetchWrapper();
    
    // SỬA LỖI: Thêm dấu phẩy ở đầu để bỏ qua biến 'alert' thừa
    const [, setAlert] = useRecoilState(alertBachAtom);
    
    const [curChatPerson, setCurChatPerson] = useRecoilState(curChatPersonAtom);
    const [curListMessages, setCurListMessage] = useRecoilState(curListMessagesAtom);
    const [curListContact, setCurListContact] = useRecoilState(curListContactAtom);
    
    const [waitingToAddContact, setWaitingToAddContact] = useRecoilState(waitToAddContactAtom);
    const [listUpdateLatestMsg, setListUpdateLatestMsg] = useRecoilState(waitForUpdateLatestMsgAtom);

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
            // console.log(">>> [Chat] Đang tải tin nhắn với:", student_code);
            setCurListMessage([]); // Xóa tin nhắn cũ trên giao diện

            let res = await fetchWrapper.get(`/api/chat/messages/${student_code}`);
            
            if (res && (res.status === "Success" || res.ok)) {
                if (typeof res.json === 'function') {
                    res = await res.json();
                }

                // console.log(">>> [Chat] Tải thành công tin nhắn.");
                
                setCurChatPerson(student_code);
                setCurListMessage(res.data || res.message || []);
            }
            
            return res;
        } catch (e) {
            console.error(e);
            setAlert({message: "Lỗi tải tin nhắn", description: e.toString()});
        }
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
        waitForUpdateLatestMsgAtom
    };
}

export default useChatWrapper;