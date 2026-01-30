import { Link } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

import { useAuthWrapper } from '_helpers';
export { PasswordRecover };

function PasswordRecover({ history }) {
    const authWrapper = useAuthWrapper();
    // form validation rules 
    const validationSchema = Yup.object().shape({
        email: Yup.string().email('Email không hợp lệ').required('Vui lòng nhập email đã đăng ký'),
    });
    const formOptions = { resolver: yupResolver(validationSchema) };

    // get functions to build form with useForm() hook
    const { register, handleSubmit, formState } = useForm(formOptions);
    const { errors, isSubmitting } = formState;

    async function onSubmit(data) {
        await authWrapper.forgetPassword({ email: data.email });
    }

    return (
        <>
            <h4>Khôi phục tài khoản</h4>
            <p className="text-muted mb-3">Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.</p>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-group">
                    <label>Email đã đăng ký</label>
                    <input name="email" type="text" {...register('email')} className={`form-control ${errors.email ? 'is-invalid' : ''}`} />
                    <div className="invalid-feedback">{errors.email?.message}</div>
                </div>
                <button disabled={isSubmitting} className="btn btn-primary btn-block">
                    {isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
                    Khôi phục
                </button>
                <div className="auth-links">
                    <Link to="login" className="btn btn-link p-0">Quay lại đăng nhập</Link>
                </div>
            </form>
        </>
    );
}
