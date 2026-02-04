import { useRecoilState, useSetRecoilState } from 'recoil';
import { authAtom, sessionExpiredAtom } from '_state';

export { useFetchWrapper };

const API_BASE = (process.env.NODE_ENV === 'production' ? process.env.REACT_APP_BACKEND_URL : 'http://localhost:5000') || 'http://localhost:5000';
const API_BASE_CLEAN = (API_BASE || '').replace(/\/$/, '');

// Debug: kiểm tra URL API khi deploy (xóa dòng này sau khi fix xong)
if (typeof window !== 'undefined') console.log('[API] Backend URL:', API_BASE_CLEAN || '(empty - sẽ gọi localhost!)');

function useFetchWrapper() {
    const [auth] = useRecoilState(authAtom);
    const setSessionExpired = useSetRecoilState(sessionExpiredAtom);

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

            const finalUrl = resolveUrl(url);
            return fetch(finalUrl, requestOptions).then((response) => handleResponse(response, finalUrl));
        }
    }

    function authHeader(url) {
        // Recoil có thể chưa sync; fallback localStorage để export/blob vẫn gửi token
        const token = auth || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        const isLoggedIn = !!token;
        const isApiUrl = url.startsWith('/api') || url.startsWith('/admin') || url.startsWith('http');

        if (isLoggedIn && isApiUrl) {
            return { Authorization: `Bearer ${token}` };
        }
        return {};
    }

    function handleResponse(response, requestUrl) {
        return response.text().then(text => {
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (e) {
                data = null;
            }
            
            if (!response.ok) {
                const isLoginRequest = typeof requestUrl === 'string' && (
                    requestUrl.includes('/api/auth/login') || requestUrl.includes('/auth/login')
                );
                if ([401, 403].includes(response.status) && !isLoginRequest) {
                    const from = encodeURIComponent(window.location.pathname + window.location.search || '');
                    setSessionExpired({ from });
                    return Promise.reject(new Error('SESSION_EXPIRED'));
                }
                if (isLoginRequest && response.status === 401) {
                    return Promise.reject(new Error('Tài khoản hoặc mật khẩu không đúng'));
                }

                const errorMsg = (data && data.message) || response.statusText || "Lỗi kết nối";
                return Promise.reject(new Error(errorMsg));
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
    
    function resolveUrl(url) {
        if (typeof url !== 'string' || url.startsWith('http')) {
            return url;
        }
        if (!API_BASE_CLEAN) {
            return url;
        }
        if (url.startsWith('/')) {
            return `${API_BASE_CLEAN}${url}`;
        }
        return `${API_BASE_CLEAN}/${url}`;
    }
}