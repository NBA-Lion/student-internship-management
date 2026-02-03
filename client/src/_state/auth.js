import { atom } from 'recoil';

const authAtom = atom({
    key: 'token',
    // Cookie ưu tiên; fallback localStorage để đảm bảo token có khi gọi API (export, blob...)
    default: (typeof window !== 'undefined' && (getCookie("token") || localStorage.getItem("token"))) || ""
});

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

export { authAtom };