import { useEffect } from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

import { authAtom } from '_state';
import { Login, PasswordRecover, Register } from './';
import './account.css';

export { Account };

function Account({ history, match }) {
    const auth = useRecoilValue(authAtom);
    const { path } = match;

    useEffect(() => {
        if (auth) history.push('/');
    }, [auth, history]);

    return (
        <div className="auth-page">
            <div className="auth-shell">
                <div className="auth-info">
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ 
                            display: 'inline-block',
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: '24px',
                            marginBottom: '16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            letterSpacing: '0.5px'
                        }}>
                            🎓 TRUNG TÂM HỖ TRỢ THỰC TẬP
                        </div>
                        <h2 style={{ 
                            fontSize: '32px',
                            marginBottom: '16px',
                            lineHeight: '1.3',
                            textShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                            Hệ thống Quản lý<br/>Sinh viên Thực tập
                        </h2>
                        <p style={{ 
                            fontSize: '15px',
                            lineHeight: '1.6',
                            marginBottom: '24px',
                            opacity: 0.95
                        }}>
                            Nền tảng quản lý tập trung, giúp sinh viên và giáo vụ theo dõi
                            tình trạng đăng ký, quá trình thực tập và kết quả đánh giá một cách hiệu quả.
                        </p>
                        <ul style={{ 
                            listStyle: 'none',
                            padding: 0,
                            margin: 0
                        }}>
                            <li style={{ 
                                padding: '10px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <span style={{
                                    display: 'inline-flex',
                                    width: '24px',
                                    height: '24px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px'
                                }}>✓</span>
                                Đăng ký thực tập nhanh chóng, rõ ràng
                            </li>
                            <li style={{ 
                                padding: '10px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <span style={{
                                    display: 'inline-flex',
                                    width: '24px',
                                    height: '24px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px'
                                }}>✓</span>
                                Theo dõi trạng thái hồ sơ theo thời gian thực
                            </li>
                            <li style={{ 
                                padding: '10px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <span style={{
                                    display: 'inline-flex',
                                    width: '24px',
                                    height: '24px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px'
                                }}>✓</span>
                                Tra cứu kết quả và phản hồi từ đơn vị
                            </li>
                            <li style={{ 
                                padding: '10px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <span style={{
                                    display: 'inline-flex',
                                    width: '24px',
                                    height: '24px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px'
                                }}>✓</span>
                                Hỗ trợ chat trực tiếp với Giáo vụ
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="auth-card">
                    <Switch>
                        <Route path={`${path}/login`} component={Login} />
                        <Route path={`${path}/passwordrecover`} component={PasswordRecover} />
                        <Route path={`${path}/register`} component={Register} />
                        <Redirect from={path} to={`${path}/login`} />
                    </Switch>
                </div>
            </div>
        </div>
    );
}
