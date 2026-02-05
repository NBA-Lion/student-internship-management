import { 
    Layout, Form, Avatar, Input, DatePicker, Button, Switch, Upload, 
    message as antdMessage, Row, Col, Card, Divider, Typography, Tag, Spin
} from 'antd';
import { 
    UserOutlined, UploadOutlined, FilePdfOutlined, FileWordOutlined,
    MailOutlined, PhoneOutlined, IdcardOutlined, CalendarOutlined,
    BankOutlined, BookOutlined, TeamOutlined, LockOutlined,
    EditOutlined, CameraOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { pickBy, identity } from 'lodash';
import { useRecoilState } from 'recoil';

import { useProfileAction } from '_actions';
import { alertBachAtom } from '_state';
import { useFetchWrapper } from '_helpers';
import { normalizeFileUrl } from '_helpers/Constant';

import locale from 'antd/es/date-picker/locale/vi_VN';

export { ProfileForm };

const { Title, Text } = Typography;
const { Header, Content } = Layout;

// ============================================
// CONSTANTS & STYLES
// ============================================
const DATE_FORMAT = 'DD/MM/YYYY';

const containerStyle = {
    maxWidth: 900,
    margin: '0 auto',
    padding: '24px'
};

const headerStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    height: 180,
    borderRadius: '12px 12px 0 0',
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 60
};

const avatarContainerStyle = {
    position: 'absolute',
    bottom: -50,
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center'
};

const avatarStyle = {
    border: '4px solid #fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    backgroundColor: '#667eea'
};

const cardStyle = {
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 16
};

const sectionTitleStyle = {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (timestamp) => {
    if (!timestamp) return null;
    return moment.utc(timestamp).format(DATE_FORMAT);
};

const formatTimestampToMoment = (timestamp) => {
    if (!timestamp) return null;
    return moment(formatDate(timestamp), DATE_FORMAT);
};

const getRoleDisplay = (role) => {
    switch (role) {
        case 'admin': return { text: 'Quản trị viên', color: 'red' };
        case 'mentor': return { text: 'Cán bộ hướng dẫn', color: 'blue' };
        case 'teacher': return { text: 'Giảng viên', color: 'purple' };
        case 'student': return { text: 'Sinh viên', color: 'green' };
        default: return { text: 'Người dùng', color: 'default' };
    }
};

const getInternStatusDisplay = (status) => {
    switch (status) {
        case 'approved': return { text: 'Đã duyệt', color: 'green' };
        case 'pending': return { text: 'Chờ duyệt', color: 'orange' };
        case 'rejected': return { text: 'Từ chối', color: 'red' };
        case 'completed': return { text: 'Hoàn thành', color: 'blue' };
        default: return { text: status || 'Chưa xác định', color: 'default' };
    }
};

/** Map dữ liệu profile sang giá trị form (để form không bắt nhập lại khi đã có sẵn) */
const getFormValuesFromData = (data, isAdmin) => {
    if (!data) return {};
    const values = {
        name: data.name || data.full_name || '',
        email: data.email,
        phone_number: data.phone_number || data.phone || undefined,
    };
    if (isAdmin) return values;
    return {
        ...values,
        student_code: data.student_code || data.vnu_id,
        date_of_birth: formatTimestampToMoment(data.date_of_birth),
        parent_number: data.parent_number || undefined,
        address: data.address || undefined,
        class_name: data.class_name || data.class || undefined,
        faculty: data.faculty || undefined,
        major: data.major || undefined,
    };
};

// ============================================
// MAIN COMPONENT
// ============================================
function ProfileForm(props) {
    const profileAction = useProfileAction();
    const fetchWrapper = useFetchWrapper();
    const [form] = Form.useForm();
    const [alert, setAlert] = useRecoilState(alertBachAtom);
    
    // UI State
    const [passwordSwitch, setPasswordSwitch] = useState(false);
    const [submitButtonLoading, setSubmitButtonLoading] = useState(false);
    const [uploading, setUploading] = useState({ cv: false, recommendation: false, avatar: false });
    const [localData, setLocalData] = useState(null);
    
    const userData = useMemo(() => JSON.parse(localStorage.getItem("userData") || '{}'), []);
    const data = props.data || localData;
    const isTable = props.isTable;
    
    // Determine user role (safe check, không phân biệt hoa thường)
    const userRole = (data?.role || userData?.role || 'student').toString().toLowerCase();
    const isAdmin = ['admin', 'mentor', 'teacher'].includes(userRole);
    const isStudent = userRole === 'student';

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => {
        if (!props.data) {
            profileAction.getMyProfile().then(newData => {
                if (newData) setLocalData(newData);
            });
        }
    }, []);

    useEffect(() => {
        if (data) {
            const isAdminRole = data.role === 'admin' || data.role === 'mentor' || data.role === 'teacher';
            const initialValues = getFormValuesFromData(data, isAdminRole);
            form.setFieldsValue(initialValues);
        }
    }, [data, form]);

    // ============================================
    // HANDLERS
    // ============================================
    const handleFileUpload = useCallback(async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);
        
        setUploading(prev => ({ ...prev, [type]: true }));
        
        try {
            const endpoint = type === 'cv' 
                ? '/api/user/upload/cv'
                : type === 'recommendation' 
                    ? '/api/user/upload/recommendation'
                    : '/api/user/upload/avatar';
            
            const response = await fetchWrapper.post(endpoint, undefined, formData);
            const result = await response.json();
            
            if (result.status === 'Success') {
                antdMessage.success(result.message || 'Upload thành công!');
                
                // Update local data
                setLocalData(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev };
                    if (type === 'cv') updated.cv_url = result.data.url;
                    else if (type === 'recommendation') updated.recommendation_letter_url = result.data.url;
                    else if (type === 'avatar') updated.avatar_url = result.data.url;
                    return updated;
                });
                
                // Refresh profile
                profileAction.getMyProfile();
            } else {
                antdMessage.error(result.message || 'Upload thất bại');
            }
        } catch (error) {
            antdMessage.error('Có lỗi xảy ra khi upload file');
            console.error('Upload error:', error);
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
        
        return false;
    }, [fetchWrapper, profileAction]);

    const cancelEdit = useCallback(() => {
        setAlert({ message: "Thành công", description: "Đã hoàn tác các thay đổi!" });
        form.resetFields();
        setPasswordSwitch(false);
    }, [form, setAlert]);

    const handleSubmit = useCallback(async () => {
        try {
            setSubmitButtonLoading(true);
            const values = await form.validateFields();
            
            // ============================================
            // PART 2: DYNAMIC PAYLOAD CONSTRUCTION
            // ============================================
            let updateData = {};
            
            if (isAdmin) {
                // Admin payload - only basic fields
                updateData = {
                    name: values.name,
                    phone_number: values.phone_number,
                };
                
                // Password fields (if changing)
                if (passwordSwitch && values.old_password && values.new_password) {
                    updateData.old_password = values.old_password;
                    updateData.new_password = values.new_password;
                }
            } else if (isStudent) {
                // Student payload - more fields but EXCLUDE system-controlled ones
                updateData = {
                    name: values.name,
                    phone_number: values.phone_number,
                    parent_number: values.parent_number,
                    address: values.address,
                };
                
                // Date fields
                if (values.date_of_birth) {
                    const dob = values.date_of_birth;
                    updateData.date_of_birth = moment.isMoment(dob) 
                        ? dob.valueOf() 
                        : (typeof dob === 'string' ? moment(dob, DATE_FORMAT).valueOf() : Number(dob));
                }
                
                // Academic info (editable by student)
                updateData.faculty = values.faculty ?? '';
                updateData.major = values.major ?? '';
                updateData.class_name = values.class_name ?? '';
                
                // Password fields (if changing)
                if (passwordSwitch && values.old_password && values.new_password) {
                    updateData.old_password = values.old_password;
                    updateData.new_password = values.new_password;
                }
                
                // EXCLUDE these fields from student payload (system-controlled):
                // - final_grade, internship_status, department
                // - intern_start_date, intern_end_date (controlled by registration)
                // - student_code, vnu_id, email (immutable)
            }
            
            // Remove empty/undefined values
            updateData = pickBy(updateData, identity);
            // Sinh viên: luôn gửi Lớp/Khoa/Ngành (kể cả rỗng) để sửa/xóa giá trị sai trong DB
            if (isStudent) {
                updateData.class_name = values.class_name ?? '';
                updateData.faculty = values.faculty ?? '';
                updateData.major = values.major ?? '';
            }
            
            // Submit
            const userId = data?.student_code || data?.vnu_id || 'me';
            await profileAction.handleSubmit(updateData, userId, isTable);
            
            setPasswordSwitch(false);
        } catch (e) {
            console.error('Submit error:', e);
            let errMsg = 'Có lỗi xảy ra';
            if (typeof e?.message === 'string') errMsg = e.message;
            else if (e?.errorFields?.length && e.errorFields[0]?.errors?.length) errMsg = e.errorFields[0].errors[0];
            else if (e?.response?.data?.message || e?.data?.message) errMsg = e.response?.data?.message || e.data?.message;
            else if (typeof e === 'string') errMsg = e;
            setAlert({ message: "Lỗi", description: errMsg });
        } finally {
            setSubmitButtonLoading(false);
        }
    }, [form, isAdmin, isStudent, passwordSwitch, data, isTable, profileAction, setAlert]);

    // ============================================
    // RENDER LOADING STATE
    // ============================================
    if (!data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Đang tải thông tin..." />
            </div>
        );
    }

    const roleDisplay = getRoleDisplay(data.role);

    // ============================================
    // PART 1: CONDITIONAL UI RENDERING
    // ============================================
    return (
        <Layout style={{ background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={containerStyle}>
                {/* Header with Avatar */}
                <Card bodyStyle={{ padding: 0 }} style={{ ...cardStyle, overflow: 'hidden' }}>
                    <div style={headerStyle}>
                        <div style={avatarContainerStyle}>
                            <Avatar
                                size={100}
                                src={data.avatar_url}
                                icon={<UserOutlined />}
                                style={avatarStyle}
                            />
                            {/* Avatar Upload Button */}
                            <Upload
                                beforeUpload={(file) => handleFileUpload(file, 'avatar')}
                                showUploadList={false}
                                accept=".jpg,.jpeg,.png,.gif"
                            >
                                <Button 
                                    type="primary" 
                                    shape="circle" 
                                    size="small"
                                    icon={<CameraOutlined />}
                                    loading={uploading.avatar}
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: 0, 
                                        right: 0,
                                        background: '#667eea',
                                        border: 'none'
                                    }}
                                />
                            </Upload>
                        </div>
                    </div>
                    
                    {/* User Info Summary */}
                    <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 24 }}>
                        <Title level={4} style={{ margin: 0 }}>
                            {data.name || 'Chưa cập nhật'}
                        </Title>
                        <Text type="secondary">{data.email}</Text>
                        <div style={{ marginTop: 8 }}>
                            <Tag color={roleDisplay.color}>{roleDisplay.text}</Tag>
                        </div>
                    </div>
                </Card>

                {/* Form */}
                <Form
                    form={form}
                    layout="vertical"
                    requiredMark={false}
                >
                    {/* ============================================ */}
                    {/* ADMIN VIEW - Simplified Form */}
                    {/* ============================================ */}
                    {isAdmin && (
                        <>
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <IdcardOutlined style={{ color: '#667eea' }} />
                                    Thông tin cá nhân
                                </span>
                            } style={cardStyle}>
                                <Row gutter={24}>
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Họ và tên" 
                                            name="name"
                                            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                                        >
                                            <Input 
                                                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="Nhập họ và tên"
                                                defaultValue={data.name}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Email" name="email">
                                            <Input 
                                                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                                                defaultValue={data.email}
                                                disabled
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Số điện thoại" 
                                            name="phone_number"
                                            rules={[
                                                { pattern: /^[0-9]{9,11}$/, message: 'Số điện thoại không hợp lệ' }
                                            ]}
                                        >
                                            <Input 
                                                prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="Nhập số điện thoại"
                                                defaultValue={data.phone_number}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Mã nhân viên">
                                            <Input 
                                                prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />}
                                                defaultValue={data.vnu_id || data.student_code}
                                                disabled
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>

                            {/* Password Section */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <LockOutlined style={{ color: '#667eea' }} />
                                    Đổi mật khẩu
                                </span>
                            } style={cardStyle}>
                                <Form.Item label="Bạn muốn đổi mật khẩu?">
                                    <Switch
                                        checked={passwordSwitch}
                                        checkedChildren="Có"
                                        unCheckedChildren="Không"
                                        onChange={(checked) => setPasswordSwitch(checked)}
                                    />
                                </Form.Item>
                                
                                {passwordSwitch && (
                                    <Row gutter={24}>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Mật khẩu cũ" 
                                                name="old_password"
                                                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}
                                            >
                                                <Input.Password placeholder="Nhập mật khẩu hiện tại" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Mật khẩu mới" 
                                                name="new_password"
                                                rules={[
                                                    { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                                                    { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }
                                                ]}
                                            >
                                                <Input.Password placeholder="Nhập mật khẩu mới" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Xác nhận mật khẩu mới" 
                                                name="confirm_new_password"
                                                dependencies={['new_password']}
                                                rules={[
                                                    { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                                                    ({ getFieldValue }) => ({
                                                        validator(_, value) {
                                                            if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                                                            return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                                                        }
                                                    })
                                                ]}
                                            >
                                                <Input.Password placeholder="Nhập lại mật khẩu mới" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                )}
                            </Card>
                        </>
                    )}

                    {/* ============================================ */}
                    {/* STUDENT VIEW - Full Form */}
                    {/* ============================================ */}
                    {isStudent && (
                        <>
                            {/* Personal Information */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <IdcardOutlined style={{ color: '#667eea' }} />
                                    Thông tin cá nhân
                                </span>
                            } style={cardStyle}>
                                <Row gutter={24}>
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Họ và tên" 
                                            name="name"
                                            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                                        >
                                            <Input 
                                                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="Nhập họ và tên"
                                                defaultValue={data.name}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="MSSV" name="student_code">
                                            <Input 
                                                prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />}
                                                defaultValue={data.student_code || data.vnu_id}
                                                disabled
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Ngày sinh" name="date_of_birth">
                                            <DatePicker
                                                style={{ width: '100%' }}
                                                placeholder="Chọn ngày sinh"
                                                defaultValue={formatTimestampToMoment(data.date_of_birth)}
                                                format={DATE_FORMAT}
                                                locale={locale}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Email" name="email">
                                            <Input 
                                                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                                                defaultValue={data.email}
                                                disabled
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Số điện thoại" 
                                            name="phone_number"
                                            rules={[
                                                { pattern: /^[0-9]{9,11}$/, message: 'Số điện thoại không hợp lệ' }
                                            ]}
                                        >
                                            <Input 
                                                prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="Nhập số điện thoại"
                                                defaultValue={data.phone_number}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="SĐT Phụ huynh" 
                                            name="parent_number"
                                            rules={[
                                                { pattern: /^[0-9]{9,11}$/, message: 'Số điện thoại không hợp lệ' }
                                            ]}
                                        >
                                            <Input 
                                                prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="Nhập SĐT phụ huynh"
                                                defaultValue={data.parent_number}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24}>
                                        <Form.Item label="Địa chỉ" name="address">
                                            <Input 
                                                placeholder="Nhập địa chỉ liên hệ"
                                                defaultValue={data.address}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>

                            {/* Academic Information */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <BookOutlined style={{ color: '#667eea' }} />
                                    Thông tin học vấn
                                </span>
                            } style={cardStyle}>
                                <Row gutter={24}>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Lớp" name="class_name">
                                            <Input 
                                                prefix={<TeamOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="VD: K66-CA-CLC1"
                                                defaultValue={data.class_name || data.class}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Khoa" name="faculty">
                                            <Input 
                                                prefix={<BankOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="VD: Công nghệ thông tin"
                                                defaultValue={data.faculty}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Ngành" name="major">
                                            <Input 
                                                prefix={<BookOutlined style={{ color: '#bfbfbf' }} />}
                                                placeholder="VD: Khoa học máy tính"
                                                defaultValue={data.major}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>

                            {/* Internship Information (READ-ONLY) */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <SafetyCertificateOutlined style={{ color: '#667eea' }} />
                                    Thông tin thực tập
                                    <Tag color="blue" style={{ marginLeft: 8, fontWeight: 400 }}>Chỉ xem</Tag>
                                </span>
                            } style={cardStyle}>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    Các thông tin này được quản lý bởi hệ thống và không thể chỉnh sửa trực tiếp.
                                </Text>
                                <Row gutter={24}>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Đơn vị thực tập">
                                            <Input 
                                                prefix={<BankOutlined style={{ color: '#bfbfbf' }} />}
                                                value={data.department || data.intern_company || 'Chưa đăng ký'}
                                                disabled
                                                style={{ backgroundColor: '#fafafa' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Đợt thực tập">
                                            <Input
                                                prefix={<CalendarOutlined style={{ color: '#bfbfbf' }} />}
                                                value={data.internship_period || 'Chưa xác định'}
                                                disabled
                                                style={{ backgroundColor: '#fafafa' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Trạng thái">
                                            <div>
                                                <Tag color={getInternStatusDisplay(data.internship_status).color}>
                                                    {getInternStatusDisplay(data.internship_status).text}
                                                </Tag>
                                            </div>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Ngày bắt đầu">
                                            <Input 
                                                prefix={<CalendarOutlined style={{ color: '#bfbfbf' }} />}
                                                value={data.intern_start_date ? formatDate(data.intern_start_date) : 'Chưa xác định'}
                                                disabled
                                                style={{ backgroundColor: '#fafafa' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Ngày kết thúc">
                                            <Input 
                                                prefix={<CalendarOutlined style={{ color: '#bfbfbf' }} />}
                                                value={data.intern_end_date ? formatDate(data.intern_end_date) : 'Chưa xác định'}
                                                disabled
                                                style={{ backgroundColor: '#fafafa' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>

                            {/* Documents Upload */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <FilePdfOutlined style={{ color: '#667eea' }} />
                                    Hồ sơ đính kèm
                                </span>
                            } style={cardStyle}>
                                <Row gutter={24}>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="CV xin việc">
                                            <Upload
                                                beforeUpload={(file) => handleFileUpload(file, 'cv')}
                                                showUploadList={false}
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            >
                                                <Button 
                                                    icon={<UploadOutlined />} 
                                                    loading={uploading.cv}
                                                    style={{ width: '100%' }}
                                                >
                                                    {data.cv_url ? 'Cập nhật CV' : 'Tải lên CV'}
                                                </Button>
                                            </Upload>
                                            {data.cv_url && (
                                                <div style={{ marginTop: 8 }}>
                                                    <a href={normalizeFileUrl(data.cv_url)} target="_blank" rel="noreferrer">
                                                        <FilePdfOutlined style={{ color: '#ff4d4f' }} /> Xem CV đã upload
                                                    </a>
                                                </div>
                                            )}
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item label="Thư giới thiệu">
                                            <Upload
                                                beforeUpload={(file) => handleFileUpload(file, 'recommendation')}
                                                showUploadList={false}
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            >
                                                <Button 
                                                    icon={<UploadOutlined />} 
                                                    loading={uploading.recommendation}
                                                    style={{ width: '100%' }}
                                                >
                                                    {data.recommendation_letter_url ? 'Cập nhật thư' : 'Tải lên thư giới thiệu'}
                                                </Button>
                                            </Upload>
                                            {data.recommendation_letter_url && (
                                                <div style={{ marginTop: 8 }}>
                                                    <a href={normalizeFileUrl(data.recommendation_letter_url)} target="_blank" rel="noreferrer">
                                                        <FileWordOutlined style={{ color: '#1890ff' }} /> Xem thư giới thiệu
                                                    </a>
                                                </div>
                                            )}
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>

                            {/* Password Section */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <LockOutlined style={{ color: '#667eea' }} />
                                    Đổi mật khẩu
                                </span>
                            } style={cardStyle}>
                                <Form.Item label="Bạn muốn đổi mật khẩu?">
                                    <Switch
                                        checked={passwordSwitch}
                                        checkedChildren="Có"
                                        unCheckedChildren="Không"
                                        onChange={(checked) => setPasswordSwitch(checked)}
                                    />
                                </Form.Item>
                                
                                {passwordSwitch && (
                                    <Row gutter={24}>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Mật khẩu cũ" 
                                                name="old_password"
                                                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}
                                            >
                                                <Input.Password placeholder="Nhập mật khẩu hiện tại" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Mật khẩu mới" 
                                                name="new_password"
                                                rules={[
                                                    { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                                                    { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }
                                                ]}
                                            >
                                                <Input.Password placeholder="Nhập mật khẩu mới" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Xác nhận mật khẩu mới" 
                                                name="confirm_new_password"
                                                dependencies={['new_password']}
                                                rules={[
                                                    { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                                                    ({ getFieldValue }) => ({
                                                        validator(_, value) {
                                                            if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                                                            return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                                                        }
                                                    })
                                                ]}
                                            >
                                                <Input.Password placeholder="Nhập lại mật khẩu mới" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                )}
                            </Card>
                        </>
                    )}

                    {/* Action Buttons */}
                    <Card style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                            <Button 
                                size="large"
                                onClick={cancelEdit}
                                style={{ minWidth: 120 }}
                            >
                                Hoàn tác
                            </Button>
                            <Button 
                                type="primary" 
                                size="large"
                                icon={<EditOutlined />}
                                onClick={handleSubmit}
                                loading={submitButtonLoading}
                                style={{ 
                                    minWidth: 160,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none'
                                }}
                            >
                                Lưu thay đổi
                            </Button>
                        </div>
                    </Card>
                </Form>
            </div>
        </Layout>
    );
}
