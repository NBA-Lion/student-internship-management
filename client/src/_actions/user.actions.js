import { useRecoilState, useSetRecoilState, useResetRecoilState } from 'recoil';

import { history, useFetchWrapper, useAuthWrapper } from '_helpers';
import { authAtom, usersAtom, userAtom, currentClassAtom } from '_state';
import { alertBachAtom } from '_state';
export { useUserActions };

function useUserActions () {
    const baseUrl = `${process.env.REACT_APP_API_URL}/users`;
    const fetchWrapper = useFetchWrapper();
    const authWrapper = useAuthWrapper();
    const [alert, setAlert] = useRecoilState(alertBachAtom)
    const [auth, setAuth] = useRecoilState(authAtom);
    const setUsers = useSetRecoilState(usersAtom);
    const setUser = useSetRecoilState(userAtom);
    const [curClass, setCurClass] = useRecoilState(currentClassAtom)
    return {
        login,
        logout,
        register,
        update,
        delete: _delete,
        resetUsers: useResetRecoilState(usersAtom),
        resetUser: useResetRecoilState(userAtom)
    }

    async function login({ username, password }) {
        let response = { status: "", data: "" };
        try {
            // Gọi backend mới: /api/auth/login -> { user, token }
            response = await authWrapper.login({ username, password });

            if (response.status !== "Success") {
                throw new Error(response.data || "Đăng nhập thất bại");
            }

            // Điều hướng về trang trước đó hoặc dashboard
            const { from } =
                (history.location && history.location.state && history.location.state.from) ||
                { from: { pathname: "/" } };
            history.push(from);
        } catch (e) {
            setAlert({
                message: "Lỗi",
                description: (response && response.data) || e.message || "Đăng nhập thất bại",
            });
        }
    }

    async function logout() {
        // remove user from local storage, set auth state to null and redirect to login page
        // localStorage.removeItem('token');
        console.log("Logout called.");
        await authWrapper.logout();
        setCurClass(null);
        history.push('/account/login');
    }

    function register(user) {
        return fetchWrapper.post(`${baseUrl}/register`, user);
    }

    // function getAll() {
    //     return fetchWrapper.get(baseUrl).then(setUsers);
    // }

    // function getById(id) {
    //     return fetchWrapper.get(`${baseUrl}/${id}`).then(setUser);
    // //}

    function update(id, params) {
        return fetchWrapper.put(`${baseUrl}/${id}`, params)
            .then(x => {
                // update stored user if the logged in user updated their own record
                if (id === auth?.id) {
                    // update local storage
                    const user = { ...auth, ...params };
                    localStorage.setItem('user', JSON.stringify(user));

                    // update auth user in recoil state
                    setAuth(user);
                }
                return x;
            });
    }

    // prefixed with underscored because delete is a reserved word in javascript
    function _delete(id) {
        setUsers(users => users.map(x => {
            // add isDeleting prop to user being deleted
            if (x.id === id) 
                return { ...x, isDeleting: true };

            return x;
        }));

        return fetchWrapper.delete(`${baseUrl}/${id}`)
            .then(() => {
                // remove user from list after deleting
                setUsers(users => users.filter(x => x.id !== id));

                // auto logout if the logged in user deleted their own record
                if (id === auth?.id) {
                    logout();
                }
            });
    }
}
