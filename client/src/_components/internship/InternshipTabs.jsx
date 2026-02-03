import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useRecoilValue, useRecoilState } from 'recoil';
import { 
    Tabs, Card, Form, Input, DatePicker, Button, Upload, Row, Col, Select,
    Tag, Descriptions, Alert, Spin, Timeline, Typography, Divider,
    message, notification, Result, Empty, Breadcrumb
} from 'antd';
import {
    FormOutlined, FileSearchOutlined, CheckCircleOutlined,
    UploadOutlined, FilePdfOutlined, CalendarOutlined,
    BankOutlined, BookOutlined, UserOutlined, PhoneOutlined,
    MailOutlined, ClockCircleOutlined, LoadingOutlined,
    ExclamationCircleOutlined, FileTextOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { authAtom, profileAtom } from '_state';
import { useFetchWrapper } from '_helpers';
import { useProfileAction } from '_actions';

import locale from 'antd/es/date-picker/locale/vi_VN';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const DATE_FORMAT = 'DD/MM/YYYY';
const API_BASE = 'http://localhost:5000';

// ============================================
// STYLES
// ============================================
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
    if (!timestamp) return 'Chưa xác định';
    return moment(timestamp).format(DATE_FORMAT);
};

const getStatusTag = (status) => {
    const statusMap = {
        'Chờ duyệt': { color: 'orange', icon: <ClockCircleOutlined /> },
        'Đang thực tập': { color: 'blue', icon: <LoadingOutlined /> },
        'Đã hoàn thành': { color: 'green', icon: <CheckCircleOutlined /> },
        'Từ chối': { color: 'red', icon: <ExclamationCircleOutlined /> },
        'Đạt': { color: 'green', icon: <CheckCircleOutlined /> },
        'Không đạt': { color: 'red', icon: <ExclamationCircleOutlined /> },
    };
    const config = statusMap[status] || { color: 'default', icon: null };
    return <Tag color={config.color} icon={config.icon}>{status || 'Chưa đăng ký'}</Tag>;
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function InternshipTabs() {
    const history = useHistory();
    const auth = useRecoilValue(authAtom);
    const [profile, setProfile] = useRecoilState(profileAtom);
    const fetchWrapper = useFetchWrapper();
    const profileAction = useProfileAction();
    
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState({ cv: false, letter: false });
    const [activeTab, setActiveTab] = useState('registration');
    const [periods, setPeriods] = useState([]);

    // Load profile on mount
    useEffect(() => {
        if (!profile) {
            profileAction.getMyProfile();
        }
    }, []);

    // Load danh sách đợt thực tập (cho dropdown)
    useEffect(() => {
        let cancelled = false;
        async function loadPeriods() {
            try {
                const res = await fetchWrapper.get('/api/periods/all');
                const json = await res.json();
                if (cancelled) return;
                if (json.status === 'Success' && Array.isArray(json.data)) {
                    setPeriods(json.data);
                }
            } catch (e) {
                console.warn('Không tải được danh sách đợt thực tập:', e);
            }
        }
        loadPeriods();
        return () => { cancelled = true; };
    }, [fetchWrapper]);

    // Reset form when profile changes
    useEffect(() => {
        if (profile) {
            form.setFieldsValue({
                topic: profile.internship_topic,
                internship_unit: profile.internship_unit || profile.department,
                period_id: profile.internship_period_id || profile.period_id || undefined,
                start_date: profile.start_date ? moment(profile.start_date) : null,
                end_date: profile.end_date ? moment(profile.end_date) : null,
                mentor_name: profile.mentor_name,
                mentor_email: profile.mentor_email,
                mentor_phone: profile.mentor_phone,
            });
        }
    }, [profile, form]);

    // ============================================
    // FILE UPLOAD HANDLERS
    // ============================================
    const handleFileUpload = useCallback(async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);
        
        setUploading(prev => ({ ...prev, [type]: true }));
        
        try {
            const endpoint = type === 'cv' ? '/api/user/upload/cv' : '/api/user/upload/recommendation';
            const response = await fetchWrapper.post(endpoint, undefined, formData);
            const result = await response.json();
            
            if (result.status === 'Success') {
                message.success(result.message || `Upload ${type === 'cv' ? 'CV' : 'thư giới thiệu'} thành công!`);
                // Refresh profile to get new URL
                await profileAction.getMyProfile();
            } else {
                message.error(result.message || 'Upload thất bại');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi upload file');
            console.error('Upload error:', error);
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
        
        return false;
    }, [fetchWrapper, profileAction]);

    // ============================================
    // PHASE 2: HANDLE REGISTRATION SUBMISSION
    // ============================================
    const handleUpdateRegistration = useCallback(async (values) => {
        try {
            setSubmitting(true);

            // Construct payload
            const payload = {
                topic: values.topic,
                internship_unit: values.internship_unit,
                period_id: values.period_id || null,
                start_date: values.start_date ? values.start_date.valueOf() : null,
                end_date: values.end_date ? values.end_date.valueOf() : null,
                cv_url: profile?.cv_url,
                introduction_letter_url: profile?.recommendation_letter_url,
                mentor_name: values.mentor_name,
                mentor_email: values.mentor_email,
                mentor_phone: values.mentor_phone,
            };

            // Call Registration Endpoint
            const response = await fetchWrapper.put(
                '/api/user/internship-registration',
                'application/json',
                payload
            );
            const result = await response.json();

            if (result.status === 'Success') {
                notification.success({
                    message: 'Đăng ký thành công!',
                    description: 'Hồ sơ đang chờ Giáo vụ duyệt. Bạn sẽ nhận được thông báo khi có kết quả.',
                    placement: 'topRight',
                    duration: 5
                });
                
                // Refresh profile
                await profileAction.getMyProfile();
                
                // Switch to status tab
                setActiveTab('status');
            } else {
                notification.error({
                    message: 'Đăng ký thất bại',
                    description: result.message || 'Có lỗi xảy ra, vui lòng thử lại.',
                    placement: 'topRight'
                });
            }
        } catch (error) {
            notification.error({
                message: 'Lỗi kết nối',
                description: 'Không thể kết nối đến server. Vui lòng thử lại sau.',
                placement: 'topRight'
            });
            console.error('Registration error:', error);
        } finally {
            setSubmitting(false);
        }
    }, [fetchWrapper, profile, profileAction]);

    // ============================================
    // RENDER LOADING
    // ============================================
    if (!profile) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Đang tải thông tin..." />
            </div>
        );
    }

    // Safe access to profile properties
    const internshipStatus = profile?.internship_status || '';
    const hasRegistration = internshipStatus && internshipStatus !== '';
    const isApproved = internshipStatus === 'Đang thực tập' || internshipStatus === 'Đã hoàn thành';
    const isRejected = internshipStatus === 'Từ chối';
    const isPending = internshipStatus === 'Chờ duyệt';

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, paddingTop: 24 }}>
            <Breadcrumb style={{ marginBottom: 20, fontSize: 13, color: '#8c8c8c' }}>
                <Breadcrumb.Item><span style={{ cursor: 'pointer', color: '#8c8c8c' }} onClick={() => history.push('/')}>Trang chủ</span></Breadcrumb.Item>
                <Breadcrumb.Item>Đăng ký thực tập</Breadcrumb.Item>
            </Breadcrumb>

            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                type="card"
                size="large"
            >
                {/* ============================================ */}
                {/* TAB 1: ĐĂNG KÝ THỰC TẬP */}
                {/* ============================================ */}
                <TabPane 
                    tab={<span><FormOutlined /> Đăng ký</span>} 
                    key="registration"
                >
                    {/* Show alert if already registered */}
                    {hasRegistration && (
                        <Alert
                            message={
                                isPending ? "Hồ sơ đang chờ duyệt" :
                                isApproved ? "Hồ sơ đã được duyệt" :
                                isRejected ? "Hồ sơ bị từ chối" : "Đã đăng ký"
                            }
                            description={
                                isPending ? "Bạn đã đăng ký thực tập. Hồ sơ đang chờ Giáo vụ xét duyệt." :
                                isApproved ? "Bạn có thể cập nhật thông tin liên hệ của người hướng dẫn." :
                                isRejected ? `Lý do: ${profile?.admin_note || 'Không đủ điều kiện'}. Vui lòng chỉnh sửa và đăng ký lại.` :
                                "Bạn có thể cập nhật thông tin nếu cần."
                            }
                            type={isPending ? "warning" : isApproved ? "success" : isRejected ? "error" : "info"}
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleUpdateRegistration}
                        requiredMark={false}
                    >
                        {/* Thông tin thực tập */}
                        <Card title={
                            <span style={sectionTitleStyle}>
                                <BookOutlined style={{ color: '#667eea' }} />
                                Thông tin thực tập
                            </span>
                        } style={cardStyle}>
                            <Row gutter={24}>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="Đợt thực tập"
                                        name="period_id"
                                        rules={[{ required: true, message: 'Vui lòng chọn đợt thực tập' }]}
                                    >
                                        <Select
                                            placeholder="Chọn đợt thực tập"
                                            allowClear
                                            showSearch
                                            optionFilterProp="children"
                                            filterOption={(input, opt) =>
                                                (opt?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            disabled={isApproved}
                                            notFoundContent={periods.length === 0 ? 'Chưa có đợt thực tập' : 'Không tìm thấy'}
                                        >
                                            {periods.map((p) => (
                                                <Select.Option key={p._id} value={p._id}>
                                                    {p.name || p.code || p._id}
                                                    {p.start_date && p.end_date && (
                                                        <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                                                            ({formatDate(p.start_date)} - {formatDate(p.end_date)})
                                                        </span>
                                                    )}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="Đơn vị thực tập"
                                        name="internship_unit"
                                        rules={[{ required: true, message: 'Vui lòng nhập đơn vị thực tập' }]}
                                    >
                                        <Input 
                                            prefix={<BankOutlined style={{ color: '#bfbfbf' }} />}
                                            placeholder="VD: Công ty ABC"
                                            disabled={isApproved}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24}>
                                    <Form.Item
                                        label="Đề tài thực tập"
                                        name="topic"
                                        rules={[{ required: true, message: 'Vui lòng nhập đề tài thực tập' }]}
                                    >
                                        <TextArea 
                                            rows={2}
                                            placeholder="VD: Xây dựng hệ thống quản lý nhân sự..."
                                            disabled={isApproved}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="Ngày bắt đầu"
                                        name="start_date"
                                        rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
                                    >
                                        <DatePicker 
                                            style={{ width: '100%' }}
                                            format={DATE_FORMAT}
                                            locale={locale}
                                            placeholder="Chọn ngày bắt đầu"
                                            disabled={isApproved}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="Ngày kết thúc"
                                        name="end_date"
                                        rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
                                    >
                                        <DatePicker 
                                            style={{ width: '100%' }}
                                            format={DATE_FORMAT}
                                            locale={locale}
                                            placeholder="Chọn ngày kết thúc"
                                            disabled={isApproved}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Thông tin người hướng dẫn */}
                        <Card title={
                            <span style={sectionTitleStyle}>
                                <UserOutlined style={{ color: '#667eea' }} />
                                Người hướng dẫn tại Doanh nghiệp
                            </span>
                        } style={cardStyle}>
                            <Row gutter={24}>
                                <Col xs={24} md={12}>
                                    <Form.Item label="Họ tên Mentor" name="mentor_name">
                                        <Input 
                                            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                            placeholder="VD: Nguyễn Văn A"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item label="Email Mentor" name="mentor_email">
                                        <Input 
                                            prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                                            placeholder="mentor@company.com"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item label="SĐT Mentor" name="mentor_phone">
                                        <Input 
                                            prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                                            placeholder="0123456789"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Hồ sơ đính kèm */}
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
                                            accept=".pdf,.doc,.docx"
                                        >
                                            <Button 
                                                icon={<UploadOutlined />} 
                                                loading={uploading.cv}
                                                style={{ width: '100%' }}
                                            >
                                                {profile?.cv_url ? 'Cập nhật CV' : 'Tải lên CV'}
                                            </Button>
                                        </Upload>
                                        {profile?.cv_url && (
                                            <div style={{ marginTop: 8 }}>
                                                <a href={profile.cv_url} target="_blank" rel="noreferrer">
                                                    <FilePdfOutlined style={{ color: '#ff4d4f' }} /> Xem CV đã upload
                                                </a>
                                            </div>
                                        )}
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item label="Thư giới thiệu">
                                        <Upload
                                            beforeUpload={(file) => handleFileUpload(file, 'letter')}
                                            showUploadList={false}
                                            accept=".pdf,.doc,.docx"
                                        >
                                            <Button 
                                                icon={<UploadOutlined />} 
                                                loading={uploading.letter}
                                                style={{ width: '100%' }}
                                            >
                                                {profile?.recommendation_letter_url ? 'Cập nhật thư' : 'Tải lên thư giới thiệu'}
                                            </Button>
                                        </Upload>
                                        {profile?.recommendation_letter_url && (
                                            <div style={{ marginTop: 8 }}>
                                                <a href={profile.recommendation_letter_url} target="_blank" rel="noreferrer">
                                                    <FileTextOutlined style={{ color: '#1890ff' }} /> Xem thư giới thiệu
                                                </a>
                                            </div>
                                        )}
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Submit Button */}
                        <Card style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                                <Button 
                                    size="large"
                                    onClick={() => form.resetFields()}
                                    disabled={submitting}
                                >
                                    Đặt lại
                                </Button>
                                <Button 
                                    type="primary" 
                                    size="large"
                                    htmlType="submit"
                                    loading={submitting}
                                    disabled={isApproved}
                                    style={{ 
                                        minWidth: 180,
                                        background: isApproved ? '#d9d9d9' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none'
                                    }}
                                >
                                    {hasRegistration ? 'Cập nhật đăng ký' : 'Gửi đăng ký'}
                                </Button>
                            </div>
                        </Card>
                    </Form>
                </TabPane>

                {/* ============================================ */}
                {/* TAB 2: TRẠNG THÁI HỒ SƠ */}
                {/* ============================================ */}
                <TabPane 
                    tab={<span><FileSearchOutlined /> Trạng thái</span>} 
                    key="status"
                >
                    {!hasRegistration ? (
                        <Empty 
                            description="Bạn chưa đăng ký thực tập"
                            style={{ padding: 48 }}
                        >
                            <Button type="primary" onClick={() => setActiveTab('registration')}>
                                Đăng ký ngay
                            </Button>
                        </Empty>
                    ) : (
                        <>
                            {/* Status Summary */}
                            <Card style={cardStyle}>
                                <Row gutter={24} align="middle">
                                    <Col xs={24} md={12}>
                                        <Title level={4} style={{ margin: 0 }}>Trạng thái hồ sơ</Title>
                                        <div style={{ marginTop: 8 }}>
                                            {getStatusTag(profile.internship_status)}
                                        </div>
                                    </Col>
                                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                                        {profile?.admin_note && (
                                            <Alert
                                                message="Ghi chú từ Giáo vụ"
                                                description={profile.admin_note}
                                                type={isRejected ? "error" : "info"}
                                                showIcon
                                            />
                                        )}
                                    </Col>
                                </Row>
                            </Card>

                            {/* Registration Details */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <BookOutlined style={{ color: '#667eea' }} />
                                    Thông tin đã đăng ký
                                </span>
                            } style={cardStyle}>
                                <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
                                    <Descriptions.Item label="Đề tài" span={2}>
                                        {profile?.internship_topic || 'Chưa nhập'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Đơn vị thực tập">
                                        {profile?.internship_unit || profile?.department || 'Chưa nhập'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Thời gian">
                                        {formatDate(profile?.start_date)} - {formatDate(profile?.end_date)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Người hướng dẫn">
                                        {profile?.mentor_name || 'Chưa nhập'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Email Mentor">
                                        {profile?.mentor_email || 'Chưa nhập'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Hồ sơ CV">
                                        {profile?.cv_url ? (
                                            <a href={profile.cv_url} target="_blank" rel="noreferrer">
                                                <FilePdfOutlined /> Xem CV
                                            </a>
                                        ) : <Text type="secondary">Chưa upload</Text>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Thư giới thiệu">
                                        {profile?.recommendation_letter_url ? (
                                            <a href={profile.recommendation_letter_url} target="_blank" rel="noreferrer">
                                                <FileTextOutlined /> Xem thư
                                            </a>
                                        ) : <Text type="secondary">Chưa upload</Text>}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            {/* Timeline */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <ClockCircleOutlined style={{ color: '#667eea' }} />
                                    Tiến trình
                                </span>
                            } style={cardStyle}>
                                <Timeline mode="left">
                                    <Timeline.Item 
                                        color="green"
                                        label={formatDate(profile?.updatedAt || profile?.createdAt)}
                                    >
                                        <Text strong>Đã gửi đăng ký</Text>
                                        <br />
                                        <Text type="secondary">Đề tài: {profile?.internship_topic || 'N/A'}</Text>
                                    </Timeline.Item>
                                    
                                    {isPending && (
                                        <Timeline.Item 
                                            color="orange"
                                            dot={<ClockCircleOutlined />}
                                        >
                                            <Text strong>Đang chờ Giáo vụ duyệt</Text>
                                        </Timeline.Item>
                                    )}
                                    
                                    {isRejected && (
                                        <Timeline.Item color="red">
                                            <Text strong>Hồ sơ bị từ chối</Text>
                                            <br />
                                            <Text type="secondary">{profile?.admin_note || ''}</Text>
                                        </Timeline.Item>
                                    )}
                                    
                                    {(isApproved || internshipStatus === 'Đang thực tập') && (
                                        <Timeline.Item color="blue">
                                            <Text strong>Hồ sơ đã được duyệt</Text>
                                            <br />
                                            <Text type="secondary">Bắt đầu thực tập</Text>
                                        </Timeline.Item>
                                    )}
                                    
                                    {internshipStatus === 'Đã hoàn thành' && (
                                        <Timeline.Item color="green">
                                            <Text strong>Đã hoàn thành thực tập</Text>
                                            <br />
                                            <Text type="secondary">
                                                Kết quả: {getStatusTag(profile?.final_status)}
                                            </Text>
                                        </Timeline.Item>
                                    )}
                                </Timeline>
                            </Card>
                        </>
                    )}
                </TabPane>

                {/* ============================================ */}
                {/* TAB 3: KẾT QUẢ ĐÁNH GIÁ */}
                {/* ============================================ */}
                <TabPane 
                    tab={<span><CheckCircleOutlined /> Kết quả</span>} 
                    key="result"
                >
                    {!hasRegistration || (!profile?.final_grade && !profile?.mentor_feedback && !profile?.report_score) ? (
                        <Empty 
                            description="Chưa có kết quả đánh giá"
                            style={{ padding: 48 }}
                        />
                    ) : (
                        <>
                            {/* Final Result */}
                            {profile?.final_status && (
                                <Result
                                    status={profile.final_status === 'Đạt' ? 'success' : profile.final_status === 'Không đạt' ? 'error' : 'info'}
                                    title={profile.final_status === 'Đạt' ? 'Chúc mừng! Bạn đã hoàn thành thực tập' : 
                                           profile.final_status === 'Không đạt' ? 'Kết quả: Không đạt' : 'Đang chờ đánh giá'}
                                    subTitle={`Điểm tổng kết: ${profile?.final_grade ?? 'Chưa có'}/10`}
                                />
                            )}

                            {/* Evaluation Details */}
                            <Card title={
                                <span style={sectionTitleStyle}>
                                    <FileSearchOutlined style={{ color: '#667eea' }} />
                                    Chi tiết đánh giá
                                </span>
                            } style={cardStyle}>
                                <Descriptions bordered column={1} size="small">
                                    <Descriptions.Item label="Đánh giá từ Doanh nghiệp (Mentor)">
                                        {profile?.mentor_feedback || <Text type="secondary">Chưa có</Text>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Điểm Báo cáo">
                                        {profile?.report_score !== undefined && profile?.report_score !== null ? (
                                            <Tag color={profile.report_score >= 5 ? 'green' : 'red'}>
                                                {profile.report_score}/10
                                            </Tag>
                                        ) : <Text type="secondary">Chưa chấm</Text>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Điểm Tổng kết">
                                        {profile?.final_grade !== undefined && profile?.final_grade !== null ? (
                                            <Tag color={profile.final_grade >= 5 ? 'green' : 'red'} style={{ fontSize: 16 }}>
                                                {profile.final_grade}/10
                                            </Tag>
                                        ) : <Text type="secondary">Chưa có</Text>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Trạng thái">
                                        {getStatusTag(profile?.final_status || internshipStatus)}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        </>
                    )}
                </TabPane>
            </Tabs>
        </div>
    );
}
