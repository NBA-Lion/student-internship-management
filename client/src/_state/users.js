import { atom } from 'recoil';

const userAtom = atom({
    key: 'userAtom',
    default: null
});
//2 role student, teacher

const initClassAtom = atom({
    key: 'initClassAtom',
    default: null
});

const usersAtom = atom({
    key: 'usersAtom',
    default: null
});

export { userAtom, usersAtom, initClassAtom };