import { useSetRecoilState, useResetRecoilState, useRecoilState } from 'recoil';
import { alertBachAtom } from '../_state/alert_bach';
import useChatWrapper from '_helpers/chat-wrapper';
import { useAuthWrapper } from '_helpers';
import { useFetchWrapper } from '_helpers';
import { socketWrapper } from '_helpers/socket-wrapper';
import { loadingVisibleAtom } from '_state';
import * as Configs from '_helpers/Constant';
import { curListContactAtom } from '_state/chat';
import { message } from 'antd';
function useChatAction() {
    // setAlert in form  setAlert(messageTitle, description)
    const [alert, setAlert] = useRecoilState(alertBachAtom);
    const [loadingVisible, setLoadingVisible] = useRecoilState(loadingVisibleAtom);
    const authWrapper = useAuthWrapper();
    const chatWrapper = useChatWrapper();
    const fetcher = useFetchWrapper();
    async function getRecentContact() {
        setLoadingVisible(true);
        await chatWrapper.getRecentContact();
        setLoadingVisible(false);
    }

    async function getCurChatMessageById(vnu_id) {
        setLoadingVisible(true);
        await chatWrapper.fetchCurListMessageById(vnu_id);
        setLoadingVisible(false)
    }

    async function onSendMessage(content) {
        const text = (content || '').trim();
        if (!text) return;

        // Người nhận hiện tại (được set khi click vào cuộc trò chuyện)
        const toId = chatWrapper.curChatPerson;
        if (!toId) {
            setAlert({ message: "Lỗi", description: "Chưa chọn người để nhắn tin" });
            return;
        }

        // Lấy thông tin user hiện tại để build message giống server
        let uInfo = await authWrapper.getUserInfo().catch(() => null);
        const myId = uInfo?.student_code || uInfo?.vnu_id;
        const myName = uInfo?.full_name || uInfo?.name || 'Tôi';

        const now = new Date().toISOString();
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Tin nhắn "optimistic" để hiện ngay lập tức trên UI (trước khi server trả về)
        const optimisticMessage = {
            _id: tempId,
            message: text,
            type: 'text',
            sender: myId,
            receiver: toId,
            from: {
                vnu_id: myId,
                id: myId,
                name: myName,
            },
            to: {
                vnu_id: toId,
                id: toId,
            },
            createdAt: now,
            createdDate: now,
            selfSend: true,
            isSender: true,
            _isOptimistic: true, // Đánh dấu để sau này thay bằng bản từ server
        };

        // Cập nhật ngay danh sách tin nhắn của cuộc trò chuyện hiện tại
        const currentMessages = chatWrapper.curListMessages || [];
        chatWrapper.setCurListMessage([...currentMessages, optimisticMessage]);

        // Gửi sự kiện qua Socket lên server (background)
        if (socketWrapper.socket) {
            socketWrapper.socket.emit("NewMessage", {
                to: toId,
                message: text,
                tempId: tempId,
            });
        } else {
            // Fallback: nếu socket chưa sẵn sàng, báo lỗi nhẹ
            setAlert({ message: "Lỗi kết nối", description: "Không thể kết nối máy chủ chat. Vui lòng thử lại sau." });
        }
    }

    function findContactInList(vnu_id) {
        let count = 0;
        if (chatWrapper.curListContact)
        for (var i of chatWrapper.curListContact) {
            if (i.contact.vnu_id === vnu_id)
                return {element: i, index : count};
        count++;
        }
        return {element: null, index: null};
    }

    function updateLatestMsg(latest) {
        let temp = findContactInList(latest.vnu_id);
        let i = temp.element;
        let index = temp.index;
        let newContact = {...i};
        newContact.latest_message = latest.latest_message;
        let curListContact_ = [...chatWrapper.curListContact];
        curListContact_[index] = newContact;
        chatWrapper.setCurListContact(curListContact_);
    }

    async function addContactToList(obj) {
        let vnu_id = obj.vnu_id
        let form = {contact : null, latest_message : null, latest_sender : null}
        if (obj.message) {
            form.latest_message = {message: obj.message.message}
            form.latest_sender = message.isSender ? "isMe" : "notMe"
        }
        
        if (findContactInList(vnu_id).element) return;
        try {
            
            let res = await fetcher.get(Configs.HOST_NAME + Configs.API_PATH.PROFILE_BY_ID.replace(":profileId", vnu_id));
            if (!res.ok) {
                // debugger
                setAlert({message: "Loi", description: "Link khong hop le"})
                return;
            }
            form.contact = await res.json(); 
            let newList = chatWrapper.curListContact ? [...chatWrapper.curListContact] : [];
            newList.push(form);
            chatWrapper.setCurListContact(newList);
        } catch(e) {
            setAlert({message: "Loi", description:"Khong the them contact. Err : " + e.toString()});
        }
        

    }

    return {getRecentContact, getCurChatMessageById, onSendMessage, addContactToList, updateLatestMsg}
}  

export default useChatAction;
