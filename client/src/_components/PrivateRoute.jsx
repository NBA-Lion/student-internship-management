import { Route, Redirect } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

import { useAuthWrapper } from '_helpers';
import { sessionExpiredAtom } from '_state';

export { PrivateRoute };

function PrivateRoute({ component: Component, ...rest }) {
    const authWrapper = useAuthWrapper();
    const sessionExpired = useRecoilValue(sessionExpiredAtom);
    return (
        <Route {...rest} render={props => {
            if (authWrapper.tokenValue) {
                return <Component {...props} />;
            }
            // Đang hiển thị modal "Phiên đăng nhập đã hết hạn" — không redirect, để user bấm "Đăng nhập lại"
            if (sessionExpired) {
                return <Component {...props} />;
            }
            return <Redirect to={{ pathname: '/account/login', state: { from: props.location } }} />;
        }} />
    );
}