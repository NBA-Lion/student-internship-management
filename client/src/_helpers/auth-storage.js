/**
 * Lưu/đọc auth theo TỪNG TAB (sessionStorage).
 * Reload tab admin vẫn là admin, tab user vẫn là user; không bị tab kia ghi đè.
 */

function getCookie(cname) {
    if (typeof document === 'undefined') return '';
    const name = cname + '=';
    const decoded = decodeURIComponent(document.cookie);
    const parts = decoded.split(';');
    for (let i = 0; i < parts.length; i++) {
        const c = parts[i].trim();
        if (c.indexOf(name) === 0) return c.substring(name.length);
    }
    return '';
}

/** Token: chỉ đọc từ sessionStorage (tab) hoặc migration 1 lần từ localStorage. Không dùng cookie (tránh tab khác ghi đè). */
function getToken() {
    if (typeof window === 'undefined') return '';
    let t = sessionStorage.getItem('token');
    if (t) return t;
    const fromLocal = localStorage.getItem('token');
    if (fromLocal) {
        sessionStorage.setItem('token', fromLocal);
        const ud = localStorage.getItem('userData');
        if (ud) sessionStorage.setItem('userData', ud);
        return fromLocal;
    }
    return '';
}

/** userData: ưu tiên sessionStorage, không có thì localStorage. */
function getUserData() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = sessionStorage.getItem('userData') || localStorage.getItem('userData') || '{}';
        return JSON.parse(raw);
    } catch (_) {
        return {};
    }
}

/** Chỉ ghi vào sessionStorage (theo tab). KHÔNG ghi cookie để tránh tab khác ghi đè. */
function setToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
        sessionStorage.setItem('token', token);
    } else {
        sessionStorage.removeItem('token');
    }
}

function setUserData(obj) {
    if (typeof window === 'undefined') return;
    if (obj != null) sessionStorage.setItem('userData', JSON.stringify(obj));
    else sessionStorage.removeItem('userData');
}

/** Xóa auth của tab hiện tại (và localStorage để đăng xuất sạch). */
function clearAuth() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
    } catch (_) {}
}

export {
    getToken,
    getUserData,
    setToken,
    setUserData,
    clearAuth,
    getCookie
};
