import { useEffect } from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

import { authAtom } from '_state';
import { Login, Register } from 'pages/Auth';
import { PasswordRecover } from './';

export { Account };
export default Account;

function Account({ history, match }) {
    const auth = useRecoilValue(authAtom);
    const { path } = match;

    useEffect(() => {
        if (auth) history.push('/');
    }, [auth, history]);

    return (
        <Switch>
            {/* Login & Register have their own full-page layout with split-card design */}
            <Route path={`${path}/login`} component={Login} />
            <Route path={`${path}/register`} component={Register} />
            
            {/* Password recover uses the centered card wrapper */}
            <Route path={`${path}/passwordrecover`}>
                <div className="auth-wrapper">
                    <div className="auth-container">
                        <PasswordRecover />
                    </div>
                </div>
            </Route>
            <Redirect from={path} to={`${path}/login`} />

            <style>{`
                .auth-wrapper {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
                    padding: 24px 16px;
                }

                .auth-container {
                    width: 100%;
                    max-width: 400px;
                    background: #fff;
                    border-radius: 16px;
                    padding: 32px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
            `}</style>
        </Switch>
    );
}
