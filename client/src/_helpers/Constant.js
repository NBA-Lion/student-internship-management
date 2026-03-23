const API_PATH = {
    REG_ACC: "/reg",
    LOGIN: "/auth/login",
    PROFILE_BY_ID: "/api/profile/:profileId",
    SET_PROFILE_BY_ID: "/api/profile/edit/:profileId",
    CREATE_CLASS: "/api/classes/create",
    ADD_MEMBER_CLASS: "/api/classes/:classId/members/add",
    DELETE_MEMBER_CLASS: "/api/classes/:classId/members/delete",
    MY_CLASS: "/api/classes/me",
    MY_CLASS_MEMBERS_INFORS: "/api/classes/:classId/members/infors",
    GET_CLASS_BY_ID : "/api/classes/:classId",
    POST_TO_FEED : "/api/classes/:classId/feed/add",
    GET_POST_BY_ID: "/api/classes/:classId/feed/:postId",
    GET_ALL_POSTS: "/api/classes/:classId/feed/posts/get",
    COMMENT_TO_POST: "/api/classes/:classId/feed/:postId/comments/add",
    GET_COMMENT_POST: "/api/classes/:classId/feed/:postId/comments/get",
    RECENT_CHAT: "/api/chat/recent",
    RECENT_CONTACT: "/api/chat/recentcontact",
    MESSAGES_BY_VNU_ID: "/api/chat/:otherVNUId",
    ADD_SUBJECT: "/api/subjects/add",
    UPLOAD_DSSV : "/api/upload/dssv",
    UPLOAD_DSSV_CLASS : "/api/classes/:classId/members/import",
    UPLOAD_DSCV : "/api/upload/dscv",
    UPLOAD_DSMH: "/api/upload/dsmh",
    UPLOAD_SV_MH_SCORE : "/api/scores/import",
    UPLOAD_FILE : "/api/upload/file",
    ADD_SCORE_BY_VNU_ID: "/api/scores/add",
    GET_SCORES_BY_ID : "/api/scores/:userId",
    PUBLIC_DATA: "/public/data/:filename",
    LIKE_POST: "/api/classes/:classId/feed/:postId/likes/toogle",
};
const HOST_NAME = process.env.NODE_ENV === 'production' && process.env.REACT_APP_FRONTEND_URL
  ? process.env.REACT_APP_FRONTEND_URL.replace(/\/$/, '')
  : "http://localhost:3000";
// Deploy: set REACT_APP_BACKEND_URL = https://your-backend.onrender.com trên Vercel
const API_BASE = (process.env.NODE_ENV === 'production' ? process.env.REACT_APP_BACKEND_URL : 'http://localhost:5000') || 'http://localhost:5000';
const API_BASE_CLEAN = (API_BASE || '').replace(/\/$/, '');

/**
 * Chuẩn hóa URL file (CV, thư GT, avatar):
 * - localhost → API_BASE
 * - URL đầy đủ nhưng path /uploads/... → chỉ giữ path (cùng domain trang đang mở; tránh host chết DNS như pmqltt.kit.vn)
 * - Path /uploads/... + frontend khác origin với API (Vercel+Render) → nối API_BASE
 */
function normalizeFileUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = url.trim();
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(u)) {
      const pathPart = u.replace(/^https?:\/\/[^/]+/, '') || '/';
      return `${API_BASE_CLEAN}${pathPart.startsWith('/') ? pathPart : '/' + pathPart}`;
    }

    let pathOnly = null;
    if (u.startsWith('/uploads/')) pathOnly = u;
    else if (/^https?:\/\//i.test(u)) {
      try {
        const p = new URL(u);
        if (p.pathname.startsWith('/uploads/')) {
          pathOnly = `${p.pathname}${p.search || ''}${p.hash || ''}`;
        }
      } catch (_) {
        /* ignore */
      }
    }

    if (pathOnly) {
      const base = (API_BASE_CLEAN || '').replace(/\/$/, '');
      if (typeof window === 'undefined') {
        return base ? `${base}${pathOnly}` : pathOnly;
      }
      if (!base) return pathOnly;
      try {
        const apiOrigin = new URL(/^https?:\/\//i.test(base) ? base : `http://${base}`).origin;
        if (window.location.origin === apiOrigin) return pathOnly;
        return `${base}${pathOnly}`;
      } catch (_) {
        return `${base}${pathOnly}`;
      }
    }

    return u;
  } catch (_) {
    return url;
  }
}

export { API_PATH, HOST_NAME, API_BASE_CLEAN as API_BASE, normalizeFileUrl };