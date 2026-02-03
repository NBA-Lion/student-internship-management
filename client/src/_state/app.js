import { atom } from 'recoil';
const classPickerVisibleAtom = atom({
    key: 'classpickerdrawervisible',
    // get initial state from local storage to enable user to stay logged in
    default: false,
    // default: null
});

const loadingVisibleAtom = atom({
    key: "loadingVisible",
    default: false
});

/** Khi 401/403: { from: string } (path đã encode). null = không hiện. */
const sessionExpiredAtom = atom({
    key: "sessionExpired",
    default: null
});

export { classPickerVisibleAtom, loadingVisibleAtom, sessionExpiredAtom };