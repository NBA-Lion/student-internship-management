import { Link, useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { motion } from 'framer-motion';

import { useFetchWrapper } from '_helpers';
import { useAlertActions } from '_actions';

export { Register };
export default Register;

function Register() {
    const fetchWrapper = useFetchWrapper();
    const alertActions = useAlertActions();
    const history = useHistory();

    const validationSchema = Yup.object().shape({
        full_name: Yup.string().required('Họ và tên là bắt buộc').min(2, 'Tối thiểu 2 ký tự'),
        student_code: Yup.string().required('MSSV là bắt buộc'),
        email: Yup.string().required('Email là bắt buộc').email('Email không hợp lệ'),
        password: Yup.string().required('Mật khẩu là bắt buộc').min(6, 'Tối thiểu 6 ký tự'),
        confirmPassword: Yup.string().required('Vui lòng xác nhận').oneOf([Yup.ref('password')], 'Mật khẩu không khớp'),
    });

    const formOptions = { resolver: yupResolver(validationSchema) };
    const { register, handleSubmit, formState } = useForm(formOptions);
    const { errors, isSubmitting } = formState;

    async function onSubmit(formData) {
        try {
            const body = {
                full_name: formData.full_name.trim(),
                student_code: formData.student_code.trim().toUpperCase(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: 'student'
            };

            const response = await fetchWrapper.post('/api/auth/register', 'application/json', body);
            const data = await response.json();

            if (data.user && data.token) {
                alertActions.success('Đăng ký thành công! Đang chuyển hướng...');
                setTimeout(() => {
                    history.push('/account/login');
                }, 1500);
            } else {
                alertActions.error(data.message || 'Đăng ký thất bại.');
            }
        } catch (error) {
            alertActions.error('Có lỗi xảy ra. Vui lòng thử lại.');
        }
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
            transition: { delay: 0.1 + i * 0.08, duration: 0.4, ease: "easeOut" }
        })
    };

    const brandingVariants = {
        hidden: { opacity: 0, x: -30 },
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
                {/* Left Side - Branding Panel */}
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
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                        </div>

                        <h2>Bắt đầu hành trình<br/>thực tập của bạn</h2>
                        <p className="tagline">Tạo tài khoản để truy cập đầy đủ tính năng của hệ thống quản lý thực tập</p>

                        <div className="steps">
                            <div className="step-item">
                                <div className="step-number">1</div>
                                <div className="step-text">
                                    <strong>Đăng ký tài khoản</strong>
                                    <span>Điền thông tin cá nhân</span>
                                </div>
                            </div>
                            <div className="step-connector"></div>
                            <div className="step-item">
                                <div className="step-number">2</div>
                                <div className="step-text">
                                    <strong>Xác nhận email</strong>
                                    <span>Kích hoạt tài khoản</span>
                                </div>
                            </div>
                            <div className="step-connector"></div>
                            <div className="step-item">
                                <div className="step-number">3</div>
                                <div className="step-text">
                                    <strong>Bắt đầu sử dụng</strong>
                                    <span>Khám phá hệ thống</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side - Form Panel */}
                <div className="form-panel">
                    <div className="form-content">
                        <motion.div 
                            className="form-header"
                            custom={0}
                            variants={formItemVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <h1>Tạo tài khoản mới</h1>
                            <p>Điền thông tin bên dưới để đăng ký</p>
                        </motion.div>

                        <form onSubmit={handleSubmit(onSubmit)}>
                            <motion.div 
                                className="form-group"
                                custom={1}
                                variants={formItemVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <label>Họ và tên</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        {...register('full_name')}
                                        className={errors.full_name ? 'error' : ''}
                                        placeholder="Nguyễn Văn A"
                                    />
                                    <span className="input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </span>
                                    <span className="input-focus-border"></span>
                                </div>
                                {errors.full_name && <span className="error-msg">{errors.full_name.message}</span>}
                            </motion.div>

                            <motion.div 
                                className="form-row"
                                custom={2}
                                variants={formItemVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <div className="form-group half">
                                    <label>Mã số sinh viên</label>
                                    <div className="input-wrapper">
                                        <input
                                            type="text"
                                            {...register('student_code')}
                                            className={errors.student_code ? 'error' : ''}
                                            placeholder="SV001"
                                        />
                                        <span className="input-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                            </svg>
                                        </span>
                                        <span className="input-focus-border"></span>
                                    </div>
                                    {errors.student_code && <span className="error-msg">{errors.student_code.message}</span>}
                                </div>

                                <div className="form-group half">
                                    <label>Email</label>
                                    <div className="input-wrapper">
                                        <input
                                            type="email"
                                            {...register('email')}
                                            className={errors.email ? 'error' : ''}
                                            placeholder="email@example.com"
                                        />
                                        <span className="input-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                <polyline points="22,6 12,13 2,6" />
                                            </svg>
                                        </span>
                                        <span className="input-focus-border"></span>
                                    </div>
                                    {errors.email && <span className="error-msg">{errors.email.message}</span>}
                                </div>
                            </motion.div>

                            <motion.div 
                                className="form-row"
                                custom={3}
                                variants={formItemVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <div className="form-group half">
                                    <label>Mật khẩu</label>
                                    <div className="input-wrapper">
                                        <input
                                            type="password"
                                            {...register('password')}
                                            className={errors.password ? 'error' : ''}
                                            placeholder="••••••"
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
                                </div>

                                <div className="form-group half">
                                    <label>Xác nhận mật khẩu</label>
                                    <div className="input-wrapper">
                                        <input
                                            type="password"
                                            {...register('confirmPassword')}
                                            className={errors.confirmPassword ? 'error' : ''}
                                            placeholder="••••••"
                                        />
                                        <span className="input-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            </svg>
                                        </span>
                                        <span className="input-focus-border"></span>
                                    </div>
                                    {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword.message}</span>}
                                </div>
                            </motion.div>

                            <motion.button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="submit-btn"
                                custom={4}
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
                                    <>
                                        Tạo tài khoản
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </>
                                )}
                            </motion.button>
                        </form>

                        <motion.div 
                            className="form-footer"
                            custom={5}
                            variants={formItemVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <span>Đã có tài khoản?</span>
                            <Link to="login">Đăng nhập</Link>
                        </motion.div>
                    </div>
                </div>
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
                    background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%);
                    top: -200px;
                    left: -100px;
                    animation: float 20s ease-in-out infinite;
                }

                .orb-2 {
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%);
                    bottom: -100px;
                    right: -100px;
                    animation: float 25s ease-in-out infinite reverse;
                }

                .orb-3 {
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
                    top: 60%;
                    left: 50%;
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
                    max-width: 1000px;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 
                        0 0 0 1px rgba(255, 255, 255, 0.1),
                        0 25px 50px -12px rgba(0, 0, 0, 0.5),
                        0 0 100px rgba(16, 185, 129, 0.1);
                    background: rgba(255, 255, 255, 0.98);
                    position: relative;
                    z-index: 1;
                }

                @media (min-width: 768px) {
                    .auth-card {
                        flex-direction: row;
                        min-height: 580px;
                    }
                }

                /* ===== Branding Panel ===== */
                .branding-panel {
                    display: none;
                    width: 45%;
                    background: linear-gradient(135deg, #047857 0%, #065f46 50%, #064e3b 100%);
                    position: relative;
                    overflow: hidden;
                    padding: 48px 36px;
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
                    font-size: 26px;
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
                }

                /* Steps */
                .steps {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }

                .step-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 14px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    backdrop-filter: blur(8px);
                    transition: all 0.3s ease;
                }

                .step-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(4px);
                }

                .step-number {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, rgba(52, 211, 153, 0.4) 0%, rgba(16, 185, 129, 0.4) 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: #34d399;
                    flex-shrink: 0;
                }

                .step-connector {
                    width: 2px;
                    height: 16px;
                    background: rgba(255, 255, 255, 0.15);
                    margin-left: 31px;
                }

                .step-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .step-text strong {
                    font-size: 13px;
                    font-weight: 600;
                    color: white;
                }

                .step-text span {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                }

                /* ===== Form Panel ===== */
                .form-panel {
                    width: 100%;
                    padding: 40px 32px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .form-panel {
                        width: 55%;
                        padding: 48px 48px;
                    }
                }

                .form-content {
                    max-width: 420px;
                    margin: 0 auto;
                    width: 100%;
                }

                .form-header {
                    margin-bottom: 28px;
                }

                .form-header h1 {
                    font-size: 26px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.5px;
                }

                .form-header p {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0;
                }

                .form-row {
                    display: flex;
                    gap: 12px;
                }

                .form-group {
                    margin-bottom: 18px;
                }

                .form-group.half {
                    flex: 1;
                    min-width: 0;
                }

                .form-group label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 6px;
                }

                .input-wrapper {
                    position: relative;
                }

                .form-group input {
                    width: 100%;
                    height: 46px;
                    padding: 0 14px 0 44px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 13px;
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
                    border-color: #10b981;
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
                }

                .form-group input.error {
                    border-color: #ef4444;
                    background: #fef2f2;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 18px;
                    height: 18px;
                    color: #94a3b8;
                    transition: color 0.3s;
                    pointer-events: none;
                }

                .input-icon svg {
                    width: 100%;
                    height: 100%;
                }

                .input-wrapper:focus-within .input-icon {
                    color: #10b981;
                }

                .input-focus-border {
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    width: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #10b981, #06b6d4);
                    transition: all 0.3s ease;
                    transform: translateX(-50%);
                    border-radius: 2px;
                }

                .form-group input:focus ~ .input-focus-border {
                    width: calc(100% - 4px);
                }

                .error-msg {
                    font-size: 11px;
                    color: #ef4444;
                    margin-top: 4px;
                    display: block;
                }

                .submit-btn {
                    width: 100%;
                    height: 50px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
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
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
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
                    box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5);
                }

                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .btn-arrow {
                    width: 18px;
                    height: 18px;
                    transition: transform 0.3s;
                }

                .submit-btn:hover .btn-arrow {
                    transform: translateX(4px);
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
                    margin-top: 24px;
                    font-size: 13px;
                    color: #64748b;
                }

                .form-footer a {
                    color: #10b981;
                    font-weight: 600;
                    text-decoration: none;
                    margin-left: 6px;
                    transition: color 0.2s;
                }

                .form-footer a:hover {
                    color: #059669;
                }

                /* Mobile adjustments */
                @media (max-width: 767px) {
                    .form-row {
                        flex-direction: column;
                        gap: 0;
                    }

                    .form-group.half {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
