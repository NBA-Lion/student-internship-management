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
        full_name: Yup.string().required('Họ và tên là bắt buộc'),
        student_code: Yup.string().required('MSSV là bắt buộc'),
        email: Yup.string().email('Email không hợp lệ').required('Email là bắt buộc'),
        password: Yup.string().required('Mật khẩu là bắt buộc').min(6, 'Mật khẩu ít nhất 6 ký tự'),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('password'), null], 'Mật khẩu xác nhận không khớp')
            .required('Vui lòng nhập lại mật khẩu'),
    });

    const formOptions = { resolver: yupResolver(validationSchema) };
    const { register, handleSubmit, formState } = useForm(formOptions);
    const { errors, isSubmitting } = formState;

    async function onSubmit(formData) {
        try {
            const body = {
                full_name: formData.full_name,
                student_code: formData.student_code,
                email: formData.email,
                password: formData.password,
                role: 'student',
                phone: formData.phone_number || undefined,
                university: formData.university || undefined,
                faculty: formData.faculty || undefined,
                major: formData.major || undefined,
            };
            const response = await fetchWrapper.post('/api/auth/register', 'application/json', body);
            const data = await response.json();
            if (data.user && data.token) {
                alertActions.success('Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.');
            } else {
                alertActions.error(data.message || data.data || 'Đăng ký thất bại.');
            }
        } catch (error) {
            alertActions.error(error?.toString() || 'Có lỗi xảy ra khi đăng ký.');
        }
    }

    return (
        <>
            <h4>Đăng ký tài khoản</h4>
            <p className="text-muted mb-3">Thông tin đăng ký sẽ được dùng để quản lý thực tập.</p>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-group">
                    <label>Họ và tên <span className="text-danger">*</span></label>
                    <input name="full_name" type="text" {...register('full_name')} className={`form-control ${errors.full_name ? 'is-invalid' : ''}`} />
                    <div className="invalid-feedback">{errors.full_name?.message}</div>
                </div>
                <div className="form-group">
                    <label>Email <span className="text-danger">*</span></label>
                    <input name="email" type="email" {...register('email')} className={`form-control ${errors.email ? 'is-invalid' : ''}`} />
                    <div className="invalid-feedback">{errors.email?.message}</div>
                </div>
                <div className="form-group">
                    <label>MSSV <span className="text-danger">*</span></label>
                    <input name="student_code" type="text" {...register('student_code')} className={`form-control ${errors.student_code ? 'is-invalid' : ''}`} placeholder="Mã số sinh viên" />
                    <div className="invalid-feedback">{errors.student_code?.message}</div>
                </div>
                <div className="form-group">
                    <label>Số điện thoại</label>
                    <input name="phone_number" type="text" {...register('phone_number')} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Trường</label>
                    <input name="university" type="text" {...register('university')} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Khoa</label>
                    <input name="faculty" type="text" {...register('faculty')} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Ngành</label>
                    <input name="major" type="text" {...register('major')} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Mật khẩu <span className="text-danger">*</span></label>
                    <input name="password" type="password" {...register('password')} className={`form-control ${errors.password ? 'is-invalid' : ''}`} />
                    <div className="invalid-feedback">{errors.password?.message}</div>
                </div>
                <div className="form-group">
                    <label>Nhập lại mật khẩu <span className="text-danger">*</span></label>
                    <input name="confirmPassword" type="password" {...register('confirmPassword')} className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`} />
                    <div className="invalid-feedback">{errors.confirmPassword?.message}</div>
                </div>
                <button disabled={isSubmitting} className="btn btn-primary btn-block">Đăng ký</button>
                <div className="auth-links">
                    <Link to="login" className="btn btn-link p-0">Đã có tài khoản? Đăng nhập</Link>
                </div>
            </form>
        </>
    );
}

