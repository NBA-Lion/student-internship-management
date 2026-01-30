import { useRecoilState } from 'recoil';
import { history } from '_helpers';
import { authAtom } from '_state';
import { useAlertActions } from '_actions';

export { useFetchWrapper };

function useFetchWrapper() {
    const [auth, setAuth] = useRecoilState(authAtom);
    const alertActions = useAlertActions();

    return {
        get: request('GET'),
        post: request('POST'),
        put: request('PUT'),
        delete: request('DELETE'),
    };

    function request(method) {
        return (url, contentType, body) => {
            const requestOptions = {
                method: method,
                headers: authHeader(url)
            };

            if (contentType) {
                requestOptions.headers['Content-Type'] = contentType;
            }

            if (body) {
                requestOptions.body = (contentType === 'application/json') 
                    ? JSON.stringify(body) 
                    : body;
            }

            return fetch(url, requestOptions).then(handleResponse);
        }
    }

    function authHeader(url) {
        const token = auth; 
        const isLoggedIn = !!token;
        const isApiUrl = url.startsWith('/api') || url.startsWith('/admin') || url.startsWith('http'); 
        
        if (isLoggedIn && isApiUrl) {
            return { Authorization: `Bearer ${token}` };
        } else {
            return {};
        }
    }

    function handleResponse(response) {
        return response.text().then(text => {
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (e) {
                data = null;
            }
            
            if (!response.ok) {
                if ([401, 403].includes(response.status)) {
                    console.log(">>> [Fetch] Phiên đăng nhập hết hạn. Logout.");
                    localStorage.removeItem('userData');
                    setAuth(null);
                    window.location.href = '/account/login';
                }

                const error = (data && data.message) || response.statusText;
                console.error(">>> [API Error]", error);
                return Promise.reject(error);
            }

            // Trả về object giả lập Response với method json() trả data đã parse
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                json: () => Promise.resolve(data),
                text: () => Promise.resolve(text),
                _data: data
            };
        });
    }
}