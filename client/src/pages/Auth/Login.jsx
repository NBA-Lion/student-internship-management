import { useEffect, useRef, useState } from 'react';
import { Link, Redirect, useLocation } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import ReCAPTCHA from 'react-google-recaptcha';

import { useUserActions } from '_actions';
import { authAtom } from '_state';
import { useRecoilValue } from 'recoil';
import { useAuthWrapper } from '_helpers';
import './auth-common.css';

// Test key của Google: widget luôn hiện, xác minh luôn pass (chỉ dùng dev/test). Production: set REACT_APP_RECAPTCHA_SITE_KEY.
const RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || RECAPTCHA_TEST_SITE_KEY;
const USE_RECAPTCHA = true;

export { Login };
export default Login;

function Login(props) {
    const location = useLocation();
    const userActions = useUserActions();
    const auth = useRecoilValue(authAtom);
    const authWrapper = useAuthWrapper();
    const [loginDone, setLoginDone] = useState(false);
    const [step2FA, setStep2FA] = useState(false);
    const [tempToken, setTempToken] = useState(null);
    const [code2FA, setCode2FA] = useState('');
    const [submitting2FA, setSubmitting2FA] = useState(false);
    const [requireCaptcha, setRequireCaptcha] = useState(false);
    const [captchaError, setCaptchaError] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState('');
    const recaptchaRef = useRef(null);
    const recaptchaTokenRef = useRef('');
    const search = new URLSearchParams(location.search || '');
    const isExpired = search.get('expired') === '1';
    const fromPath = search.get('from'); // Trang cần quay lại sau khi đăng nhập (vd: /admin/students)

    const validationSchema = Yup.object().shape({
        username: Yup.string().required('Vui lòng nhập tài khoản'),
        password: Yup.string().required('Vui lòng nhập mật khẩu')
    });

    const formOptions = { resolver: yupResolver(validationSchema) };
    const { register, handleSubmit, formState } = useForm(formOptions);
    const { errors, isSubmitting } = formState;

    useEffect(() => {
        let isMounted = true;
        async function loadUser() {
            await authWrapper.loadUser();
            if (isMounted) setLoginDone(true);
        }
        if (auth) {
            loadUser();
        } else {
            userActions.logout();
        }
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth]);


    if (loginDone) {
        const target = fromPath && fromPath.startsWith('/') ? fromPath : '/';
        return <Redirect to={{ pathname: target, state: { from: props.location } }} />;
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
                        {isExpired && (
                            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13 }}>
                                Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
                            </div>
                        )}
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

                        <form onSubmit={handleSubmit(async (data) => {
                            setCaptchaError('');
                            const payload = { username: data.username, password: data.password };
                            if (requireCaptcha && USE_RECAPTCHA) {
                                const tokenNow = recaptchaTokenRef.current || recaptchaRef.current?.getValue?.() || recaptchaToken;
                                payload.recaptchaToken = tokenNow || '';
                            }
                            const res = await userActions.login(payload);
                            if (res && res.status === 'Requires2FA') {
                                setTempToken(res.tempToken);
                                setStep2FA(true);
                            }
                            if (res && res.status === 'RequireCaptcha') {
                                setRequireCaptcha(true);
                                setCaptchaError(res.data || 'Vui lòng hoàn thành xác minh bên dưới.');
                                recaptchaTokenRef.current = '';
                                setRecaptchaToken('');
                                if (recaptchaRef.current) recaptchaRef.current.reset();
                            }
                        })}>
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
                                        tabIndex={0}
                                        autoComplete="username"
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
                                    <Link to="/account/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
                                </div>
                                <div className="input-wrapper">
                                    <input
                                        type="password"
                                        {...register('password')}
                                        className={errors.password ? 'error' : ''}
                                        placeholder="Nhập mật khẩu"
                                        tabIndex={0}
                                        autoComplete="current-password"
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

                            {requireCaptcha && (
                                <motion.div className="form-group captcha-block" custom={2.5} variants={formItemVariants} initial="hidden" animate="visible">
                                    <div className="captcha-title">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        Xác minh bảo mật
                                    </div>
                                    <p className="captcha-hint">Vui lòng tick ô &quot;I'm not a robot&quot; bên dưới rồi nhấn Đăng nhập.</p>
                                    {captchaError && <div className="captcha-error">{captchaError}</div>}
                                    {USE_RECAPTCHA ? (
                                        <div className="captcha-widget">
                                            <ReCAPTCHA
                                                ref={recaptchaRef}
                                                sitekey={RECAPTCHA_SITE_KEY}
                                                onChange={(token) => {
                                                    const t = token || '';
                                                    recaptchaTokenRef.current = t;
                                                    setRecaptchaToken(t);
                                                }}
                                                onExpired={() => { recaptchaTokenRef.current = ''; setRecaptchaToken(''); }}
                                            />
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 13, color: '#64748b' }}>Xác minh chưa được cấu hình. Vui lòng thử lại sau 15 phút hoặc liên hệ quản trị.</p>
                                    )}
                                </motion.div>
                            )}

                            {step2FA ? (
                                <>
                                    <motion.div className="form-group" custom={3} variants={formItemVariants} initial="hidden" animate="visible">
                                        <label>Mã xác thực 2 bước</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                placeholder="Nhập mã 6 số từ app"
                                                value={code2FA}
                                                onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                maxLength={6}
                                                className=""
                                            />
                                            <span className="input-focus-border"></span>
                                        </div>
                                        <p style={{ fontSize: 12, color: '#65676b', marginTop: 6 }}>
                                            Mở Google Authenticator (hoặc app tương tự) và nhập mã 6 số.
                                        </p>
                                    </motion.div>
                                    <motion.div style={{ display: 'flex', gap: 8 }} custom={4} variants={formItemVariants}>
                                        <button
                                            type="button"
                                            className="submit-btn"
                                            style={{ flex: 1, background: '#e4e6eb', color: '#050505' }}
                                            onClick={() => { setStep2FA(false); setTempToken(null); setCode2FA(''); }}
                                        >
                                            Quay lại
                                        </button>
                                        <button
                                            type="button"
                                            className="submit-btn"
                                            style={{ flex: 1 }}
                                            disabled={code2FA.length !== 6 || submitting2FA}
                                            onClick={async () => {
                                                setSubmitting2FA(true);
                                                const res = await userActions.verify2FALogin(tempToken, code2FA);
                                                setSubmitting2FA(false);
                                                if (res && res.status === 'Success') setLoginDone(true);
                                            }}
                                        >
                                            {submitting2FA ? <><span className="spinner"></span> Đang xác thực...</> : 'Xác thực'}
                                        </button>
                                    </motion.div>
                                </>
                            ) : (
                                <motion.button 
                                    type="submit" 
                                    disabled={isSubmitting || (requireCaptcha && (!USE_RECAPTCHA || !recaptchaToken))} 
                                    className="submit-btn"
                                    tabIndex={0}
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
                            )}
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

        </div>
    );
}
