import { atom } from 'recoil';
import { getToken } from '_helpers/auth-storage';

const authAtom = atom({
    key: 'token',
    // sessionStorage theo từng tab → reload tab admin vẫn admin, tab user vẫn user
    default: (typeof window !== 'undefined' && getToken()) || ''
});

export { authAtom };