import { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';

import {useFetchWrapper} from '_helpers';
import { profileAtom , currentClassAtom, alertBachAtom} from '_state';
import { useAlertActions , useStudentInfoAction} from '_actions';


export {useProfileAction} 

function useProfileAction() {

    const fetchWrapper = useFetchWrapper();
    const [profile,setProfile] = useRecoilState(profileAtom);
    const currentClass = useRecoilValue(currentClassAtom);
    const alertActions = useAlertActions();
    const studentInfoAction = useStudentInfoAction();
    const [alert, setAlert] = useRecoilState(alertBachAtom);

    async function getProfileById(Id) {
        const response = await fetchWrapper.get(`/api/user/profile/${Id}`);
        if (!response) return null;
        const rawjson = await response.json();
        return rawjson.status === "Success" ? rawjson.data : null;
    }

    async function getMyProfile() {
        const response = await fetchWrapper.get("/api/user/profile/me");
        if (!response) return null;
        const rawjson = await response.json();
        if (rawjson.status === "Success") {
            setProfile(rawjson.data);
            return rawjson.data;
        }
        return null;
    }

    function setMyProfile(data) {
        setProfile(data);
    }

    async function handleSubmit(info, Id, isTable) {
        const id = Id === "me" || !Id ? "me" : Id;
        const response = await fetchWrapper.post(`/api/user/profile/${id}`, "application/json", info);
        if (!response) return null;
        const rawjson = await response.json();
        if (rawjson.status === "Success") {
            // Chỉ cập nhật state từ response, KHÔNG gọi getMyProfile() để tránh bị ghi đè bởi dữ liệu cũ (đặc biệt khi admin đổi mã nhân viên)
            if (rawjson.data) {
                setProfile(rawjson.data);
            }
            if (isTable && currentClass) studentInfoAction.getStudentList(currentClass);
            setAlert({ message: "Thành công", description: "Cập nhật thông tin thành công" });
            return rawjson.data;
        } else {
            setAlert({ message: "Lỗi", description: rawjson.message || rawjson.data || "Cập nhật thất bại" });
            return null;
        }
    }

    return {
        getProfileById : getProfileById,
        getMyProfile : getMyProfile,
        setMyProfile : setMyProfile,
        handleSubmit : handleSubmit,
    }
}