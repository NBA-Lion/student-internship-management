import { useState } from 'react';
import { Link, useParams, useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { motion } from 'framer-motion';

import { useFetchWrapper } from '_helpers';
import { useRecoilState } from 'recoil';
import { alertBachAtom } from '_state';
import './auth-common.css';

export { ResetPassword };
export default ResetPassword;

const validationSchema = Yup.object().shape({
  newPassword: Yup.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').required('Vui lòng nhập mật khẩu mới'),
  confirmPassword: Yup.string()
    .required('Vui lòng xác nhận mật khẩu')
    .oneOf([Yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp'),
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

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

function ResetPassword() {
  const { token } = useParams();
  const history = useHistory();
  const fetchWrapper = useFetchWrapper();
  const [, setAlert] = useRecoilState(alertBachAtom);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState } = useForm({
    resolver: yupResolver(validationSchema),
  });
  const { errors, isSubmitting } = formState;

  async function onSubmit(data) {
    if (!token) {
      setAlert({ message: 'Lỗi', description: 'Link không hợp lệ.' });
      return;
    }
    try {
      const res = await fetchWrapper.post('/api/auth/reset-password', 'application/json', {
        token,
        newPassword: data.newPassword,
      });
      const result = await res.json();
      if (result.status === 'Success') {
        setSuccess(true);
        setAlert({ message: 'Thành công', description: result.message || 'Đặt lại mật khẩu thành công.' });
        setTimeout(() => history.replace('/account/login'), 2000);
      } else {
        setAlert({ message: 'Lỗi', description: result.message || 'Đặt lại mật khẩu thất bại.' });
      }
    } catch (e) {
      setAlert({ message: 'Lỗi', description: e.message || 'Đặt lại mật khẩu thất bại.' });
    }
  }

  if (!token) {
    return (
      <div className="auth-page auth-page--reset">
        <div className="ambient-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <motion.div className="auth-card auth-card--narrow" variants={cardVariants} initial="hidden" animate="visible">
          <div className="form-panel">
            <div className="form-content">
              <div className="form-header">
                <h1>Link không hợp lệ</h1>
                <p>Link đặt lại mật khẩu không đúng hoặc đã hết hạn. Vui lòng gửi yêu cầu mới.</p>
              </div>
              <Link to="/account/forgot-password" className="submit-btn" style={{ display: 'inline-block', marginTop: 16, textAlign: 'center', textDecoration: 'none' }}>
                Gửi yêu cầu mới
              </Link>
              <div className="form-footer" style={{ marginTop: 24 }}>
                <span>Đã nhớ mật khẩu?</span>
                <Link to="/account/login">Quay lại đăng nhập</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-page--reset">
      <div className="ambient-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <motion.div className="auth-card" variants={cardVariants} initial="hidden" animate="visible">
        <div className="form-panel">
          <div className="form-content">
            <motion.div className="form-header" custom={0} variants={formItemVariants} initial="hidden" animate="visible">
              <h1>Đặt lại mật khẩu</h1>
              <p>Nhập mật khẩu mới cho tài khoản của bạn.</p>
            </motion.div>

            {success ? (
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
                Đặt lại mật khẩu thành công. Đang chuyển đến trang đăng nhập...
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <motion.div className="form-group" custom={1} variants={formItemVariants} initial="hidden" animate="visible">
                  <label>Mật khẩu mới</label>
                  <div className="input-wrapper">
                    <input
                      type="password"
                      {...register('newPassword')}
                      className={errors.newPassword ? 'error' : ''}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                    <span className="input-icon">
                      <LockIcon />
                    </span>
                    <span className="input-focus-border"></span>
                  </div>
                  {errors.newPassword && <span className="error-msg">{errors.newPassword.message}</span>}
                </motion.div>
                <motion.div className="form-group" custom={2} variants={formItemVariants} initial="hidden" animate="visible">
                  <label>Xác nhận mật khẩu</label>
                  <div className="input-wrapper">
                    <input
                      type="password"
                      {...register('confirmPassword')}
                      className={errors.confirmPassword ? 'error' : ''}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <span className="input-icon">
                      <LockIcon />
                    </span>
                    <span className="input-focus-border"></span>
                  </div>
                  {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword.message}</span>}
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
                    'Đặt lại mật khẩu'
                  )}
                </motion.button>
              </form>
            )}

            <motion.div className="form-footer" custom={4} variants={formItemVariants} initial="hidden" animate="visible" style={{ marginTop: 28 }}>
              <span>Đã nhớ mật khẩu?</span>
              <Link to="/account/login">Quay lại đăng nhập</Link>
            </motion.div>
          </div>
        </div>

        <motion.div className="branding-panel branding-panel--reset" variants={brandingVariants} initial="hidden" animate="visible">
          <div className="particles">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`particle particle-${i + 1}`}></div>
            ))}
          </div>
          <div className="grid-pattern"></div>
          <div className="branding-content branding-content--compact">
            <div className="brand-logo brand-logo--key">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <h2>Tạo mật khẩu mới</h2>
            <p className="tagline">Đặt mật khẩu mới tối thiểu 6 ký tự. Nên dùng chữ, số và ký tự đặc biệt — tránh dùng lại mật khẩu cũ.</p>
            <div className="features features--two">
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Mật khẩu mạnh</strong>
                  <span>Kết hợp chữ, số và ký tự đặc biệt khi có thể</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Đăng nhập lại</strong>
                  <span>Sau khi đổi xong, dùng mật khẩu mới để đăng nhập</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
