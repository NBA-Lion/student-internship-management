import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

import { useFetchWrapper } from '_helpers';
import { useAlertActions } from '_actions';

export { Register };

function Register() {
    const fetchWrapper = useFetchWrapper();
    const alertActions = useAlertActions();

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
                alertActions.success('Đăng ký thành công!');
            } else {
                alertActions.error(data.message || 'Đăng ký thất bại.');
            }
        } catch (error) {
            alertActions.error('Có lỗi xảy ra.');
        }
    }

    return (
        <div className="auth-card">
            <div className="auth-header">
                <div className="auth-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                </div>
                <h1>Tạo tài khoản</h1>
                <p>Đăng ký để sử dụng hệ thống</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-group">
                    <label>Họ và tên</label>
                    <input type="text" {...register('full_name')} className={errors.full_name ? 'error' : ''} placeholder="Nguyễn Văn A" />
                    {errors.full_name && <span className="error-msg">{errors.full_name.message}</span>}
                </div>

                <div className="form-group">
                    <label>Mã số sinh viên</label>
                    <input type="text" {...register('student_code')} className={errors.student_code ? 'error' : ''} placeholder="SV001" />
                    {errors.student_code && <span className="error-msg">{errors.student_code.message}</span>}
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input type="email" {...register('email')} className={errors.email ? 'error' : ''} placeholder="email@example.com" />
                    {errors.email && <span className="error-msg">{errors.email.message}</span>}
                </div>

                <div className="form-group">
                    <label>Mật khẩu</label>
                    <input type="password" {...register('password')} className={errors.password ? 'error' : ''} placeholder="Ít nhất 6 ký tự" />
                    {errors.password && <span className="error-msg">{errors.password.message}</span>}
                </div>

                <div className="form-group">
                    <label>Xác nhận mật khẩu</label>
                    <input type="password" {...register('confirmPassword')} className={errors.confirmPassword ? 'error' : ''} placeholder="Nhập lại mật khẩu" />
                    {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword.message}</span>}
                </div>

                <button type="submit" disabled={isSubmitting} className="auth-btn">
                    {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
                </button>
            </form>

            <div className="auth-footer">
                <span>Đã có tài khoản?</span>
                <Link to="login">Đăng nhập</Link>
            </div>

            <style>{`
                .auth-card {
                    background: #fff;
                    border-radius: 12px;
                    padding: 28px 24px;
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .auth-logo {
                    width: 44px;
                    height: 44px;
                    background: #3b82f6;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 10px;
                }

                .auth-logo svg {
                    width: 22px;
                    height: 22px;
                    color: white;
                }

                .auth-header h1 {
                    font-size: 20px;
                    font-weight: 700;
                    color: #111;
                    margin: 0 0 4px 0;
                }

                .auth-header p {
                    font-size: 12px;
                    color: #666;
                    margin: 0;
                }

                .form-group {
                    margin-bottom: 14px;
                }

                .form-group label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 4px;
                }

                .form-group input {
                    width: 100%;
                    height: 38px;
                    padding: 0 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 13px;
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
                    font-size: 11px;
                    color: #ef4444;
                    margin-top: 2px;
                    display: block;
                }

                .auth-btn {
                    width: 100%;
                    height: 40px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 6px;
                }

                .auth-btn:hover:not(:disabled) {
                    background: #2563eb;
                }

                .auth-btn:disabled {
                    opacity: 0.6;
                }

                .auth-footer {
                    text-align: center;
                    margin-top: 16px;
                    padding-top: 14px;
                    border-top: 1px solid #eee;
                    font-size: 12px;
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
