import { useEffect, useState } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { motion } from 'framer-motion';

import { useUserActions } from '_actions';
import { authAtom } from '_state';
import { useRecoilValue } from 'recoil';
import { useAuthWrapper } from '_helpers';

export { Login };
export default Login;

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth]);

    const handleForgotPassword = (e) => {
        e.preventDefault();
        alert('Vui lòng liên hệ Admin để reset mật khẩu.');
    };

    if (loginDone) {
        return <Redirect to={{ pathname: '/', state: { from: props.location } }} />;
    }

    // Animation variants
    const cardVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { 
            opacity: 1, 
            scale: 1,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
        }
    };

    const formItemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: { delay: 0.1 + i * 0.1, duration: 0.4, ease: "easeOut" }
        })
    };

    const brandingVariants = {
        hidden: { opacity: 0, x: 30 },
        visible: { 
            opacity: 1,
            x: 0,
            transition: { delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div className="auth-page">
            {/* Ambient background */}
            <div className="ambient-bg">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
            </div>

            <motion.div 
                className="auth-card"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Left Side - Form Panel */}
                <div className="form-panel">
                    <div className="form-content">
                        <motion.div 
                            className="form-header"
                            custom={0}
                            variants={formItemVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <h1>Chào mừng trở lại</h1>
                            <p>Đăng nhập để tiếp tục sử dụng hệ thống</p>
                        </motion.div>

                        <form onSubmit={handleSubmit(userActions.login)}>
                            <motion.div 
                                className="form-group"
                                custom={1}
                                variants={formItemVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <label>Tài khoản</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        {...register('username')}
                                        className={errors.username ? 'error' : ''}
                                        placeholder="Email hoặc MSSV"
                                    />
                                    <span className="input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </span>
                                    <span className="input-focus-border"></span>
                                </div>
                                {errors.username && <span className="error-msg">{errors.username.message}</span>}
                            </motion.div>

                            <motion.div 
                                className="form-group"
                                custom={2}
                                variants={formItemVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <div className="label-row">
                                    <label>Mật khẩu</label>
                                    <button type="button" onClick={handleForgotPassword} className="forgot-link">
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="input-wrapper">
                                    <input
                                        type="password"
                                        {...register('password')}
                                        className={errors.password ? 'error' : ''}
                                        placeholder="Nhập mật khẩu"
                                    />
                                    <span className="input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </span>
                                    <span className="input-focus-border"></span>
                                </div>
                                {errors.password && <span className="error-msg">{errors.password.message}</span>}
                            </motion.div>

                            <motion.button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="submit-btn"
                                custom={3}
                                variants={formItemVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner"></span>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Đăng nhập'
                                )}
                            </motion.button>
                        </form>

                        <motion.div 
                            className="form-footer"
                            custom={4}
                            variants={formItemVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <span>Chưa có tài khoản?</span>
                            <Link to="register">Đăng ký ngay</Link>
                        </motion.div>
                    </div>
                </div>

                {/* Right Side - Branding Panel */}
                <motion.div 
                    className="branding-panel"
                    variants={brandingVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Floating particles */}
                    <div className="particles">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`particle particle-${i + 1}`}></div>
                        ))}
                    </div>

                    {/* Grid pattern */}
                    <div className="grid-pattern"></div>

                    <div className="branding-content">
                        <div className="brand-logo">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                        </div>

                        <h2>Hệ thống Quản lý<br/>Sinh viên Thực tập</h2>
                        <p className="tagline">Nền tảng kết nối hiệu quả giữa Sinh viên, Nhà trường và Doanh nghiệp</p>

                        <div className="features">
                            <div className="feature-item">
                                <div className="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div className="feature-text">
                                    <strong>Quản lý sinh viên</strong>
                                    <span>Theo dõi thông tin và tiến độ</span>
                                </div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                </div>
                                <div className="feature-text">
                                    <strong>Báo cáo trực tuyến</strong>
                                    <span>Nộp và chấm điểm dễ dàng</span>
                                </div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <div className="feature-text">
                                    <strong>Trao đổi trực tiếp</strong>
                                    <span>Chat và phản hồi nhanh chóng</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            <style>{`
                .auth-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #0a0f1a;
                    padding: 20px;
                    position: relative;
                    overflow: hidden;
                }

                /* Ambient background */
                .ambient-bg {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .gradient-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.5;
                }

                .orb-1 {
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
                    top: -200px;
                    right: -100px;
                    animation: float 20s ease-in-out infinite;
                }

                .orb-2 {
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%);
                    bottom: -100px;
                    left: -100px;
                    animation: float 25s ease-in-out infinite reverse;
                }

                .orb-3 {
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%);
                    top: 50%;
                    left: 30%;
                    animation: float 30s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.05); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }

                .auth-card {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 950px;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 
                        0 0 0 1px rgba(255, 255, 255, 0.1),
                        0 25px 50px -12px rgba(0, 0, 0, 0.5),
                        0 0 100px rgba(59, 130, 246, 0.1);
                    background: rgba(255, 255, 255, 0.98);
                    position: relative;
                    z-index: 1;
                }

                @media (min-width: 768px) {
                    .auth-card {
                        flex-direction: row;
                        min-height: 540px;
                    }
                }

                /* ===== Form Panel ===== */
                .form-panel {
                    width: 100%;
                    padding: 48px 36px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .form-panel {
                        width: 50%;
                        padding: 56px 48px;
                    }
                }

                .form-content {
                    max-width: 340px;
                    margin: 0 auto;
                    width: 100%;
                }

                .form-header {
                    margin-bottom: 32px;
                }

                .form-header h1 {
                    font-size: 28px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                }

                .form-header p {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 8px;
                }

                .label-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .forgot-link {
                    font-size: 12px;
                    color: #3b82f6;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    transition: color 0.2s;
                }

                .forgot-link:hover {
                    color: #1d4ed8;
                }

                .input-wrapper {
                    position: relative;
                }

                .form-group input {
                    width: 100%;
                    height: 50px;
                    padding: 0 16px 0 48px;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 14px;
                    color: #0f172a;
                    background: #f8fafc;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }

                .form-group input::placeholder {
                    color: #94a3b8;
                }

                .form-group input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }

                .form-group input.error {
                    border-color: #ef4444;
                    background: #fef2f2;
                }

                .input-icon {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 20px;
                    height: 20px;
                    color: #94a3b8;
                    transition: color 0.3s;
                    pointer-events: none;
                }

                .input-icon svg {
                    width: 100%;
                    height: 100%;
                }

                .input-wrapper:focus-within .input-icon {
                    color: #3b82f6;
                }

                .input-focus-border {
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    width: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                    transition: all 0.3s ease;
                    transform: translateX(-50%);
                    border-radius: 2px;
                }

                .form-group input:focus ~ .input-focus-border {
                    width: calc(100% - 4px);
                }

                .error-msg {
                    font-size: 12px;
                    color: #ef4444;
                    margin-top: 6px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .submit-btn {
                    width: 100%;
                    height: 52px;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                    position: relative;
                    overflow: hidden;
                }

                .submit-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: left 0.5s ease;
                }

                .submit-btn:hover::before {
                    left: 100%;
                }

                .submit-btn:hover:not(:disabled) {
                    box-shadow: 0 6px 25px rgba(59, 130, 246, 0.5);
                }

                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .form-footer {
                    text-align: center;
                    margin-top: 28px;
                    font-size: 14px;
                    color: #64748b;
                }

                .form-footer a {
                    color: #3b82f6;
                    font-weight: 600;
                    text-decoration: none;
                    margin-left: 6px;
                    transition: color 0.2s;
                }

                .form-footer a:hover {
                    color: #1d4ed8;
                }

                /* ===== Branding Panel ===== */
                .branding-panel {
                    display: none;
                    width: 50%;
                    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0f172a 100%);
                    position: relative;
                    overflow: hidden;
                    padding: 48px 40px;
                    flex-direction: column;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .branding-panel {
                        display: flex;
                    }
                }

                /* Floating particles */
                .particles {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .particle {
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    animation: particle-float 15s infinite ease-in-out;
                }

                .particle-1 { top: 20%; left: 10%; animation-delay: 0s; }
                .particle-2 { top: 60%; left: 80%; animation-delay: -3s; }
                .particle-3 { top: 80%; left: 30%; animation-delay: -6s; }
                .particle-4 { top: 30%; left: 70%; animation-delay: -9s; }
                .particle-5 { top: 50%; left: 20%; animation-delay: -12s; }
                .particle-6 { top: 10%; left: 60%; animation-delay: -15s; }

                @keyframes particle-float {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
                    25% { transform: translate(20px, -30px) scale(1.5); opacity: 0.6; }
                    50% { transform: translate(-10px, -60px) scale(1); opacity: 0.3; }
                    75% { transform: translate(15px, -30px) scale(1.2); opacity: 0.5; }
                }

                .grid-pattern {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                    background-size: 32px 32px;
                    mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
                }

                .branding-content {
                    position: relative;
                    z-index: 1;
                    color: white;
                }

                .brand-logo {
                    width: 72px;
                    height: 72px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 28px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                }

                .brand-logo svg {
                    width: 36px;
                    height: 36px;
                    color: white;
                }

                .branding-content h2 {
                    font-size: 28px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                    line-height: 1.3;
                    letter-spacing: -0.5px;
                }

                .tagline {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    margin: 0 0 32px 0;
                    line-height: 1.6;
                    max-width: 280px;
                }

                .features {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .feature-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    backdrop-filter: blur(8px);
                    transition: all 0.3s ease;
                }

                .feature-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(4px);
                }

                .feature-icon {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .feature-icon svg {
                    width: 20px;
                    height: 20px;
                    color: #93c5fd;
                }

                .feature-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .feature-text strong {
                    font-size: 14px;
                    font-weight: 600;
                    color: white;
                }

                .feature-text span {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.6);
                }
            `}</style>
        </div>
    );
}
