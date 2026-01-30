import { useRecoilState } from 'recoil';
import { useFetchWrapper } from '_helpers';
import { feedPageAtom } from '_state/feed_page';
import { useClassWrapper } from './class-wrapper';

// Đã xóa các import thừa (NewPost, socketWrapper, Configs, recoil-nexus...) để hết lỗi ESLint

function useFeedPageWrapper() {
    let classWrapper = useClassWrapper();
    let fetcher = useFetchWrapper();
    let [feedPageState, setFeedPageState] = useRecoilState(feedPageAtom);
    
    async function getAllPosts() {
        const currentClass = classWrapper.curClass;
        
        // Kiểm tra xem đã chọn lớp/đơn vị chưa
        if (!currentClass) {
            console.log(">>> [Feed] Chưa chọn đơn vị nào.");
            return;
        }

        // Lấy ID chuẩn (ưu tiên _id của MongoDB)
        const unitId = currentClass._id || currentClass.class_id;

        // console.log(">>> [Feed] Đang lấy bài đăng cho Unit:", unitId);

        try {
            // SỬA: Dùng đường dẫn tương đối để qua Proxy
            // Giả sử API lấy bài đăng của bạn là /api/post/unit/:id
            // Nếu API khác, bạn cần sửa lại đường dẫn này cho khớp Server
            let response = await fetcher.get(`/api/post/unit/${unitId}`);
            
            if (response && response.ok) {
                let json = await response.json();
                
                // SỬA LỖI: Dùng !== thay vì !=
                if (json.status !== "Error") {
                    let temp = { ...feedPageState };
                    
                    // Server mới thường trả dữ liệu trong .data
                    temp.posts = json.data || json.message || [];
                    
                    setFeedPageState(temp);
                }
                return json;
            }
        } catch (error) {
            console.error(">>> [Lỗi Feed]", error);
        }
    }

    return {
        feedPageState: feedPageState,
        getAllPosts: getAllPosts,
        setFeedPageState: setFeedPageState
    };
}

export { useFeedPageWrapper };