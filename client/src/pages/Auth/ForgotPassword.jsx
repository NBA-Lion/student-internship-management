import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { motion } from 'framer-motion';

import { useFetchWrapper } from '_helpers';
import { useRecoilState } from 'recoil';
import { alertBachAtom } from '_state';
import './auth-common.css';

export { ForgotPassword };
export default ForgotPassword;

const validationSchema = Yup.object().shape({
  email: Yup.string().email('Email không hợp lệ').required('Vui lòng nhập email đã đăng ký'),
});

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const formItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
};

const brandingVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

function ForgotPassword() {
  const fetchWrapper = useFetchWrapper();
  const [, setAlert] = useRecoilState(alertBachAtom);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState(null);

  const { register, handleSubmit, formState } = useForm({
    resolver: yupResolver(validationSchema),
  });
  const { errors, isSubmitting } = formState;

  async function onSubmit(data) {
    try {
      setResetLink(null);
      const res = await fetchWrapper.post('/api/auth/forgot-password', 'application/json', { email: data.email.trim() });
      const result = await res.json();
      if (result.status === 'Success') {
        setSent(true);
        if (result.resetLink) setResetLink(result.resetLink);
        setAlert({ message: 'Thành công', description: result.message || 'Vui lòng kiểm tra email.' });
      } else {
        setAlert({ message: 'Lỗi', description: result.message || 'Gửi yêu cầu thất bại.' });
      }
    } catch (e) {
      setAlert({ message: 'Lỗi', description: e.message || 'Gửi yêu cầu thất bại.' });
    }
  }

  return (
    <div className="auth-page auth-page--forgot">
      <div className="ambient-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <motion.div className="auth-card" variants={cardVariants} initial="hidden" animate="visible">
        <div className="form-panel">
          <div className="form-content">
            <motion.div className="form-header" custom={0} variants={formItemVariants} initial="hidden" animate="visible">
              <h1>Quên mật khẩu</h1>
              <p>Nhập email đã đăng ký để nhận link đặt lại mật khẩu.</p>
            </motion.div>

            {sent ? (
              <motion.div
                custom={1}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                style={{
                  padding: 16,
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 12,
                  color: '#166534',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: '0 0 12px 0' }}>
                  Đã gửi email. Vui lòng kiểm tra hộp thư (và thư mục spam). Link có hiệu lực 15 phút.
                </p>
                {resetLink && (
                  <p style={{ margin: 0, fontSize: 12, color: '#15803d', background: 'rgba(255,255,255,0.6)', padding: '10px', borderRadius: 8 }}>
                    <strong>Môi trường test:</strong> Email chưa gửi thật. Copy link bên dưới vào trình duyệt để đặt lại mật khẩu:
                    <br />
                    <a href={resetLink} style={{ color: '#2563eb', wordBreak: 'break-all' }}>{resetLink}</a>
                  </p>
                )}
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <motion.div
                  className="form-group"
                  custom={1}
                  variants={formItemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <label>Email</label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      {...register('email')}
                      className={errors.email ? 'error' : ''}
                      placeholder="Email đã đăng ký"
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
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="submit-btn"
                  custom={2}
                  variants={formItemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span>
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi yêu cầu'
                  )}
                </motion.button>
              </form>
            )}

            <motion.div
              className="form-footer"
              custom={3}
              variants={formItemVariants}
              initial="hidden"
              animate="visible"
            >
              <span>Đã nhớ mật khẩu?</span>
              <Link to="/account/login">Quay lại đăng nhập</Link>
            </motion.div>
          </div>
        </div>

        <motion.div className="branding-panel branding-panel--recovery" variants={brandingVariants} initial="hidden" animate="visible">
          <div className="particles">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`particle particle-${i + 1}`}></div>
            ))}
          </div>
          <div className="grid-pattern"></div>
          <div className="branding-content branding-content--compact">
            <div className="brand-logo brand-logo--mail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2>Khôi phục mật khẩu</h2>
            <p className="tagline">Nhập email đã đăng ký, chúng tôi gửi link đặt lại mật khẩu. Link có hiệu lực 15 phút — nhớ kiểm tra cả thư mục spam.</p>
            <div className="features features--two">
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Gửi link qua email</strong>
                  <span>Link đặt lại gửi tới địa chỉ email bạn đăng ký</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Bảo mật</strong>
                  <span>Link dùng một lần, tự hết hạn sau 15 phút</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
