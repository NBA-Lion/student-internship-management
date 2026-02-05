import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

import { useUserActions } from '_actions';
import { Redirect } from 'react-router-dom';
import { authAtom } from '_state';
import { useRecoilValue } from 'recoil';
import { useAuthWrapper } from '_helpers';

export { Login };

function Login(props) {
    const userActions = useUserActions();
    const auth = useRecoilValue(authAtom);
    const authWrapper = useAuthWrapper();
    const [loginDone, setLoginDone] = useState(false);

    const validationSchema = Yup.object().shape({
        username: Yup.string().required('Vui lòng nhập tài khoản'),
        password: Yup.string().required('Vui lòng nhập mật khẩu')
    });
    
    const formOptions = { resolver: yupResolver(validationSchema) };
    const { register, handleSubmit, formState } = useForm(formOptions);
    const { errors, isSubmitting } = formState;

    useEffect(() => {
        async function loadUser() {
            await authWrapper.loadUser();
            setLoginDone(true);
        }
        if (auth) {
            loadUser();
        } else {
            userActions.logout();
        }
    }, [auth]);

    const handleForgotPassword = (e) => {
        e.preventDefault();
        alert('Vui lòng liên hệ Admin để reset mật khẩu.');
    };

    if (loginDone) {
        return <Redirect to={{ pathname: '/', state: { from: props.location } }} />;
    }

    return (
        <div className="auth-card">
            <div className="auth-header">
                <div className="auth-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                </div>
                <h1>Đăng nhập</h1>
                <p>Hệ thống Quản lý Sinh viên Thực tập</p>
            </div>

            <form onSubmit={handleSubmit(userActions.login)}>
                <div className="form-group">
                    <label>Tài khoản</label>
                    <input
                        type="text"
                        {...register('username')}
                        className={errors.username ? 'error' : ''}
                        placeholder="Email hoặc MSSV"
                        tabIndex={0}
                        autoComplete="username"
                    />
                    {errors.username && <span className="error-msg">{errors.username.message}</span>}
                </div>

                <div className="form-group">
                    <div className="label-row">
                        <label>Mật khẩu</label>
                        <a href="#" onClick={handleForgotPassword} className="forgot-link">Quên mật khẩu?</a>
                    </div>
                    <input
                        type="password"
                        {...register('password')}
                        className={errors.password ? 'error' : ''}
                        placeholder="Nhập mật khẩu"
                        tabIndex={0}
                        autoComplete="current-password"
                    />
                    {errors.password && <span className="error-msg">{errors.password.message}</span>}
                </div>

                <button type="submit" disabled={isSubmitting} className="auth-btn" tabIndex={0}>
                    {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
            </form>

            <div className="auth-footer">
                <span>Chưa có tài khoản?</span>
                <Link to="register">Đăng ký</Link>
            </div>

            <style>{`
                .auth-card {
                    background: #fff;
                    border-radius: 12px;
                    padding: 32px 28px;
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 24px;
                }

                .auth-logo {
                    width: 48px;
                    height: 48px;
                    background: #3b82f6;
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 12px;
                }

                .auth-logo svg {
                    width: 24px;
                    height: 24px;
                    color: white;
                }

                .auth-header h1 {
                    font-size: 22px;
                    font-weight: 700;
                    color: #111;
                    margin: 0 0 4px 0;
                }

                .auth-header p {
                    font-size: 13px;
                    color: #666;
                    margin: 0;
                }

                .form-group {
                    margin-bottom: 16px;
                }

                .form-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 6px;
                }

                .label-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                }

                .forgot-link {
                    font-size: 12px;
                    color: #3b82f6;
                    text-decoration: none;
                }

                .form-group input {
                    width: 100%;
                    height: 42px;
                    padding: 0 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                    box-sizing: border-box;
                }

                .form-group input:focus {
                    outline: none;
                    border-color: #3b82f6;
                }

                .form-group input.error {
                    border-color: #ef4444;
                }

                .error-msg {
                    font-size: 12px;
                    color: #ef4444;
                    margin-top: 4px;
                    display: block;
                }

                .auth-btn {
                    width: 100%;
                    height: 44px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 8px;
                }

                .auth-btn:hover:not(:disabled) {
                    background: #2563eb;
                }

                .auth-btn:disabled {
                    opacity: 0.6;
                }

                .auth-footer {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                    color: #666;
                }

                .auth-footer a {
                    color: #3b82f6;
                    font-weight: 600;
                    text-decoration: none;
                    margin-left: 4px;
                }
            `}</style>
        </div>
    );
}
