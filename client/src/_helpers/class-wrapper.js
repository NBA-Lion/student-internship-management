import { useRecoilState } from 'recoil';
import { useFetchWrapper } from '_helpers';
import { useAlertActions, useStudentInfoAction, useStudentScoreAction } from '_actions';
import { classesAtom, currentClassAtom } from '_state';

export { useClassWrapper };

function useClassWrapper() {
    const fetchWrapper = useFetchWrapper();
    const alertActions = useAlertActions();
    
    // Các Action con phụ thuộc (Lưu ý: Cần đảm bảo các file này cũng đã được sửa API)
    const studentInfoAction = useStudentInfoAction();
    const studentScoreAction = useStudentScoreAction();
    
    const [classes, setClasses] = useRecoilState(classesAtom);
    const [curClass, setCurClass_] = useRecoilState(currentClassAtom);

    // --- 1. LẤY DANH SÁCH ĐƠN VỊ (LỚP) ---
    async function getClassList() {
        // console.log(">>> [ClassWrapper] Đang lấy danh sách đơn vị...");
        
        try {
            const response = await fetchWrapper.get("/api/unit/my-units");
            
            if (response && response.ok) {
                const rawjson = await response.json();
                // Ưu tiên lấy .data từ Server chuẩn mới
                const listUnits = rawjson.data || rawjson.message || [];
                // console.log(">>> [Danh sách Unit]", listUnits);
                setClasses(listUnits);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // --- 2. TẠO ĐƠN VỊ MỚI ---
    async function createClass(className) {
        // console.log(">>> [ClassWrapper] Đang tạo đơn vị mới:", className);
        
        const payload = {
            name: className,
            description: "Đơn vị thực tập tạo từ Web",
            topic: null 
        };

        try {
            const response = await fetchWrapper.post("/api/unit/create", "application/json", payload);
            
            if (response && response.ok) {
                const rawjson = await response.json();
                // console.log(">>> [Kết quả tạo]", rawjson);
                
                if (rawjson.status === "Success") {
                    alertActions.success("Tạo đơn vị thực tập thành công");
                    getClassList(); // Tải lại danh sách ngay lập tức
                } else {
                    alertActions.error("Không thể tạo đơn vị: " + (rawjson.data || "Lỗi server"));
                }
            }
        } catch (error) {
            alertActions.error("Lỗi kết nối khi tạo lớp");
        }
    }
    
    // --- 3. SET LỚP HIỆN TẠI (STATE) ---
    function setCurClass(cls) {
        setCurClass_(cls);
        if(cls) {
            localStorage.setItem("curClass", JSON.stringify(cls));
        }
    }

    // --- 4. CHỌN LỚP ĐỂ XEM CHI TIẾT ---
    function chooseClass(cls) {
        setCurClass(cls);
        
        if(cls) {
            localStorage.setItem('currentClass', JSON.stringify(cls));
        }
        
        // console.log(">>> [Đã chọn Unit]:", cls);
        
        if (cls) {
            // Gọi các Action con để lấy danh sách SV và Điểm của lớp đó
            // LƯU Ý: Nếu 2 file action này chưa sửa API thì sẽ bị lỗi 404
            studentInfoAction.getStudentList(cls);
            studentScoreAction.getScoreList(cls);
        } 
    }

    // --- 5. CHỌN LỚP BẰNG ID ---
    async function chooseClassById(classId) {
        // Gọi API lấy lại danh sách mới nhất
        let response = await fetchWrapper.get("/api/unit/my-units");
        
        if(response && response.ok) {
            let json = await response.json();
            let listUnits = json.data || json.message || [];
            
            // console.log(">>> [Tìm Unit theo ID]:", classId);
            
            for (var myClass of listUnits) {
                // Nếu không truyền ID thì chọn cái đầu tiên
                if (classId === null || classId === undefined) {
                    chooseClass(myClass);
                    break;
                }
                
                // So sánh _id (MongoDB)
                if (classId === myClass._id || classId === myClass.class_id) {
                    chooseClass(myClass);
                    break;
                }
            }
        }
    } 

    // --- 6. LẤY THÔNG TIN GIÁO VIÊN/MENTOR CỦA LỚP ---
    async function getCurrentClassTeacherInfo() {
        if (curClass) {
            let id = curClass._id || curClass.class_id;
            let response = await fetchWrapper.get(`/api/unit/${id}`);
            if (response && response.ok) {
                return await response.json();
            }
        }
    }

    return {
        classes,
        curClass,
        getCurrentClassTeacherInfo,
        getClassList,
        createClass,
        chooseClass,
        chooseClassById,
        setCurClass
    };
}