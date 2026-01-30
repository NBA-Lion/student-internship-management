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
        if (!response) return;
        const rawjson = await response.json();
        if (rawjson.status === "Success") {
            await getMyProfile();
            if (isTable && currentClass) studentInfoAction.getStudentList(currentClass);
            setAlert({ message: "Thành công", description: "Cập nhật thông tin thành công" });
        } else {
            setAlert({ message: "Lỗi", description: rawjson.data || rawjson.message || "Cập nhật thất bại" });
        }
    }

    return {
        getProfileById : getProfileById,
        getMyProfile : getMyProfile,
        setMyProfile : setMyProfile,
        handleSubmit : handleSubmit,
    }
}