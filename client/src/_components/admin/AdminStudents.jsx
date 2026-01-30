import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useHistory, useLocation } from 'react-router-dom';
import { 
    Table, Tag, Button, Select, Input, Modal, Descriptions, Space, Form, 
    InputNumber, Checkbox, message, Popconfirm, notification, Row, Col, 
    Divider, Card, Typography, Alert, Spin
} from 'antd';
import { 
    CheckOutlined, CloseOutlined, EyeOutlined, UserOutlined, LoadingOutlined, 
    DownloadOutlined, FilePdfOutlined, FileTextOutlined, CalendarOutlined,
    BankOutlined, BookOutlined, PhoneOutlined, MailOutlined
} from '@ant-design/icons';
import { useFetchWrapper } from '_helpers';
import { authAtom } from '_state';
import moment from 'moment';

const { Option } = Select;
const { Text, Title } = Typography;
const BASE = '/api/admin';
const DATE_FORMAT = 'DD/MM/YYYY';

// Helper function to format date
const formatDate = (timestamp) => {
    if (!timestamp) return 'Chưa xác định';
    return moment(timestamp).format(DATE_FORMAT);
};

export { AdminStudents };

function AdminStudents() {
    const history = useHistory();
    const location = useLocation();
    const fetchWrapper = useFetchWrapper();
    const token = useRecoilValue(authAtom);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(null); // Track which student is being approved
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [statusFilter, setStatusFilter] = useState();
    const [majorFilter, setMajorFilter] = useState('');
    const [universityFilter, setUniversityFilter] = useState('');
    const [periodFilter, setPeriodFilter] = useState();
    const [detailVisible, setDetailVisible] = useState(false);
    const [rejectVisible, setRejectVisible] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectNote, setRejectNote] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [form] = Form.useForm();

    // TASK 1: Parse query parameters và set filter tự động
    useEffect(() => {
        if (userData.role !== 'admin') {
            history.replace('/');
            return;
        }

        // Parse query params từ URL
        const searchParams = new URLSearchParams(location.search);
        const statusParam = searchParams.get('status');
        
        if (statusParam) {
            // Tự động set filter theo query param
            setStatusFilter(statusParam);
            message.info(`Đang hiển thị: ${statusParam}`);
        }
    }, [location.search]);

    // Load students khi statusFilter thay đổi (bao gồm cả khi set từ URL param)
    useEffect(() => {
        if (userData.role === 'admin') {
            loadStudents();
        }
    }, [statusFilter]);

    useEffect(() => {
        if (userData.role !== 'admin') return;
        (async () => {
            try {
                const [pr, mn] = await Promise.all([
                    fetchWrapper.get('/api/period/all'),
                    fetchWrapper.get(BASE + '/mentors'),
                ]);
                const pData = await pr.json();
                const mData = await mn.json();
                if (pData.status === 'Success') setPeriods(Array.isArray(pData.data) ? pData.data : []);
                if (mData.status === 'Success') setMentors(Array.isArray(mData.data) ? mData.data : []);
            } catch (_) {}
        })();
    }, []);

    async function loadStudents() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (majorFilter) params.append('major', majorFilter);
            if (universityFilter) params.append('university', universityFilter);
            if (periodFilter) params.append('period_id', periodFilter);
            const q = params.toString();
            
            // Thử gọi API mới trước, nếu lỗi thì dùng API cũ
            try {
                const res = await fetchWrapper.get(q ? `${BASE}/students?${q}` : `${BASE}/students`);
                const data = await res.json();
                if (data.status === 'Success') {
                    setStudents(data.data || []);
                    return;
                }
            } catch (e) {
                // Fallback to old API
            }
            
            // Fallback: API cũ
            const res = await fetchWrapper.get(q ? `${BASE}/users/all?${q}` : `${BASE}/users/all`);
            const data = await res.json();
            if (data.status === 'Success') setStudents(data.data || []);
        } finally {
            setLoading(false);
        }
    }

    // Hàm để clear filter và update URL
    function clearFilters() {
        setStatusFilter(undefined);
        setMajorFilter('');
        setUniversityFilter('');
        setPeriodFilter(undefined);
        // Remove query params from URL
        history.push('/admin/students');
    }

    // Hàm xuất CSV
    async function exportToCSV() {
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (majorFilter) params.append('major', majorFilter);
            if (universityFilter) params.append('university', universityFilter);
            const q = params.toString();
            
            message.loading({ content: 'Đang xuất file CSV...', key: 'exportCSV' });
            
            const url = q ? `${BASE}/export/csv?${q}` : `${BASE}/export/csv`;
            const token = localStorage.getItem('token');
            
            // Use fetch directly để có thể xử lý blob response
            const response = await fetch(`http://localhost:5000${url}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            // Get blob và trigger download
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Danh_sach_sinh_vien_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            
            message.success({ content: 'Xuất CSV thành công!', key: 'exportCSV' });
        } catch (error) {
            message.error({ content: 'Có lỗi xảy ra khi xuất CSV', key: 'exportCSV' });
            console.error('Export CSV error:', error);
        }
    }

    function openDetail(record) {
        if (!record) return;
        setSelectedStudent(record);
        setDetailVisible(true);
        // Reset form with correct field names (matching the new evaluation form)
        form.setFieldsValue({
            mentor_feedback: record?.mentor_feedback || '',
            report_score: record?.report_score,
            final_grade: record?.final_grade,
            is_completed: record?.final_status === 'Đạt' || record?.is_completed || false,
            admin_note: record?.admin_note || '',
        });
    }

    function openReject(record) {
        setRejectTarget(record);
        setRejectNote(record.admin_note || '');
        setRejectVisible(true);
    }

    // ========== PHASE 3: HANDLE APPROVE ==========
    async function handleApprove(record) {
        try {
            setApproving(record._id);
            
            // Gọi API Status mới
            const res = await fetchWrapper.put(
                `/api/user/${record.student_code}/status`,
                'application/json',
                { status: 'Đã duyệt' }
            );
            
            const data = await res.json();
            
            if (data.status === 'Success') {
                notification.success({
                    message: 'Duyệt thành công',
                    description: `Đã duyệt hồ sơ sinh viên ${record.name || record.full_name}`,
                    placement: 'topRight'
                });
                await loadStudents(); // Refresh danh sách
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            notification.error({
                message: 'Lỗi duyệt hồ sơ',
                description: error.message || 'Không thể duyệt hồ sơ',
                placement: 'topRight'
            });
        } finally {
            setApproving(null);
        }
    }

    // ========== PHASE 3: HANDLE REJECT ==========
    async function handleReject() {
        if (!rejectTarget) return;
        
        try {
            setLoading(true);
            
            // Gọi API Status mới với ghi chú từ chối
            const res = await fetchWrapper.put(
                `/api/user/${rejectTarget.student_code}/status`,
                'application/json',
                { 
                    status: 'Từ chối', 
                    admin_note: rejectNote || 'Hồ sơ không đủ điều kiện'
                }
            );
            
            const data = await res.json();
            
            if (data.status === 'Success') {
                notification.warning({
                    message: 'Đã từ chối',
                    description: `Đã từ chối hồ sơ sinh viên ${rejectTarget.name || rejectTarget.full_name}`,
                    placement: 'topRight'
                });
                setRejectVisible(false);
                setRejectTarget(null);
                setRejectNote('');
                await loadStudents(); // Refresh danh sách
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            notification.error({
                message: 'Lỗi từ chối hồ sơ',
                description: error.message || 'Không thể từ chối hồ sơ',
                placement: 'topRight'
            });
        } finally {
            setLoading(false);
        }
    }

    // Legacy function - giữ lại để tương thích
    async function updateStatus(record, newStatus) {
        if (newStatus === 'Đã duyệt') {
            return handleApprove(record);
        }
        
        try {
            setLoading(true);
            await fetchWrapper.put(
                `/api/user/${record.student_code}/status`,
                'application/json',
                { status: newStatus }
            );
            message.success(`Đã cập nhật trạng thái: ${newStatus}`);
            await loadStudents();
        } catch (error) {
            message.error('Lỗi cập nhật trạng thái');
        } finally {
            setLoading(false);
        }
    }

    async function assignMentor(record, mentorId) {
        if (!mentorId) return;
        try {
            setLoading(true);
            await fetchWrapper.post(
                `/api/user/profile/${record.student_code}`,
                'application/json',
                { mentor_ref: mentorId }
            );
            await loadStudents();
            if (selectedStudent?._id === record._id) {
                setSelectedStudent({ ...selectedStudent, mentor_ref: mentors.find(m => m._id === mentorId) });
            }
        } finally {
            setLoading(false);
        }
    }

    // ========== PHASE 3: HANDLE SAVE EVALUATION (NEW API) ==========
    async function handleSaveEvaluation(values) {
        if (!selectedStudent) return;
        try {
            setLoading(true);
            
            // Call new Evaluation Endpoint
            const res = await fetchWrapper.put(
                `/api/user/${selectedStudent.student_code}/evaluation`,
                'application/json',
                {
                    mentor_feedback: values.mentor_feedback,
                    report_score: values.report_score,
                    final_grade: values.final_grade,
                    final_status: values.is_completed ? 'Đạt' : (values.final_grade !== undefined && values.final_grade < 5 ? 'Không đạt' : 'Pending'),
                    admin_note: values.admin_note
                }
            );
            
            const data = await res.json();
            
            if (data.status === 'Success') {
                notification.success({
                    message: 'Lưu thành công',
                    description: 'Đã cập nhật đánh giá cho sinh viên',
                    placement: 'topRight'
                });
                await loadStudents();
                setDetailVisible(false);
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            notification.error({
                message: 'Lỗi',
                description: error.message || 'Không thể lưu đánh giá',
                placement: 'topRight'
            });
        } finally {
            setLoading(false);
        }
    }

    function exportCSV() {
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (majorFilter) params.append('major', majorFilter);
        if (universityFilter) params.append('university', universityFilter);
        if (periodFilter) params.append('period_id', periodFilter);
        const q = params.toString();
        const url = `${BASE}/export${q ? '?' + q : ''}`;
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const u = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = u;
                a.download = 'danh-sach-thuc-tap.csv';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(u);
                a.remove();
            });
    }

    const columns = [
        { title: 'MSSV', dataIndex: 'student_code', key: 'student_code', width: 100 },
        { 
            title: 'Họ và tên', 
            dataIndex: 'name', 
            key: 'name',
            render: (text, record) => (
                <span>
                    <UserOutlined style={{ marginRight: 8 }} />
                    {text || record.full_name}
                </span>
            )
        },
        { title: 'Trường', dataIndex: 'university', key: 'university', ellipsis: true },
        { title: 'Ngành', dataIndex: 'major', key: 'major', ellipsis: true },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (v) => {
                let c = 'default';
                if (v === 'Chờ duyệt') c = 'gold';
                if (v === 'Đang thực tập') c = 'green';
                if (v === 'Đã hoàn thành') c = 'blue';
                if (v === 'Từ chối') c = 'red';
                return <Tag color={c}>{v || 'Chưa xác định'}</Tag>;
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 240,
            render: (_, record) => (
                <Space wrap size="small">
                    <Button 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    >
                        Chi tiết
                    </Button>
                    
                    {/* Nút Duyệt - chỉ hiển thị khi status = Chờ duyệt */}
                    {record.status === 'Chờ duyệt' && (
                        <Popconfirm
                            title="Xác nhận duyệt"
                            description={`Duyệt hồ sơ của ${record.name || record.full_name}?`}
                            onConfirm={() => handleApprove(record)}
                            okText="Duyệt"
                            cancelText="Hủy"
                            okButtonProps={{ loading: approving === record._id }}
                        >
                            <Button 
                                size="small" 
                                type="primary"
                                icon={approving === record._id ? <LoadingOutlined /> : <CheckOutlined />}
                                loading={approving === record._id}
                            >
                                Duyệt
                            </Button>
                        </Popconfirm>
                    )}
                    
                    {/* Nút Từ chối - chỉ hiển thị khi status = Chờ duyệt */}
                    {record.status === 'Chờ duyệt' && (
                        <Button 
                            size="small" 
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => openReject(record)}
                        >
                            Từ chối
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="container mt-3">
            <h3>Quản lý sinh viên thực tập</h3>

            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Select
                    allowClear
                    placeholder="Trạng thái"
                    style={{ width: 160 }}
                    value={statusFilter}
                    onChange={(val) => {
                        setStatusFilter(val);
                        // Update URL khi thay đổi filter
                        if (val) {
                            history.push(`/admin/students?status=${encodeURIComponent(val)}`);
                        } else {
                            history.push('/admin/students');
                        }
                    }}
                >
                    <Option value="Chờ duyệt">Chờ duyệt</Option>
                    <Option value="Đang thực tập">Đang thực tập</Option>
                    <Option value="Đã hoàn thành">Đã hoàn thành</Option>
                    <Option value="Từ chối">Từ chối</Option>
                </Select>
                <Input
                    placeholder="Trường"
                    style={{ width: 160 }}
                    value={universityFilter}
                    onChange={e => setUniversityFilter(e.target.value)}
                />
                <Input
                    placeholder="Ngành"
                    style={{ width: 140 }}
                    value={majorFilter}
                    onChange={e => setMajorFilter(e.target.value)}
                />
                <Select
                    allowClear
                    placeholder="Đợt thực tập"
                    style={{ width: 180 }}
                    value={periodFilter}
                    onChange={setPeriodFilter}
                >
                    {periods.map(p => (
                        <Option key={p._id} value={p.period_id || p.semester_id}>{p.period_name || p.semester_name || p.period_id || p.semester_id}</Option>
                    ))}
                </Select>
                <Button type="primary" onClick={loadStudents}>Lọc</Button>
                <Button onClick={clearFilters}>Xóa bộ lọc</Button>
                <Button type="default" icon={<DownloadOutlined />} onClick={exportToCSV}>
                    Xuất CSV
                </Button>
            </div>

            {/* Hiển thị filter đang active */}
            {statusFilter && (
                <div style={{ marginBottom: 16 }}>
                    <Tag color="blue" closable onClose={() => clearFilters()}>
                        Đang lọc: {statusFilter}
                    </Tag>
                </div>
            )}

            <Table
                rowKey="_id"
                columns={columns}
                dataSource={students}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                scroll={{ x: 800 }}
            />

            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <CloseOutlined /> Từ chối hồ sơ
                    </span>
                }
                visible={rejectVisible}
                onOk={handleReject}
                onCancel={() => { setRejectVisible(false); setRejectTarget(null); setRejectNote(''); }}
                okText="Xác nhận từ chối"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                confirmLoading={loading}
            >
                {rejectTarget && (
                    <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                        <p style={{ margin: 0 }}>
                            <strong>Sinh viên:</strong> {rejectTarget.name || rejectTarget.full_name}
                        </p>
                        <p style={{ margin: 0 }}>
                            <strong>MSSV:</strong> {rejectTarget.student_code}
                        </p>
                    </div>
                )}
                <p style={{ marginBottom: 8 }}><strong>Lý do từ chối:</strong></p>
                <Input.TextArea
                    rows={4}
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="Nhập lý do từ chối hồ sơ (sinh viên sẽ nhìn thấy ghi chú này)..."
                />
            </Modal>

            {/* ========== PHASE 3: IMPROVED EVALUATION MODAL ========== */}
            <Modal
                visible={detailVisible}
                title={
                    <span>
                        <UserOutlined style={{ marginRight: 8 }} />
                        Hồ sơ & Đánh giá sinh viên
                    </span>
                }
                footer={null}
                onCancel={() => { setDetailVisible(false); setSelectedStudent(null); }}
                width={800}
                bodyStyle={{ maxHeight: '75vh', overflowY: 'auto' }}
                destroyOnClose
            >
                {selectedStudent ? (
                    <>
                        {/* ========== SECTION A: READ-ONLY - Student Registration Data ========== */}
                        <Card 
                            size="small" 
                            title={<Text strong><BookOutlined /> Thông tin đăng ký thực tập</Text>}
                            style={{ marginBottom: 16 }}
                        >
                            <Row gutter={[16, 12]}>
                                {/* Basic Info */}
                                <Col xs={24} md={12}>
                                    <Text type="secondary">MSSV:</Text>
                                    <div><Text strong>{selectedStudent?.student_code || 'N/A'}</Text></div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Text type="secondary">Họ và tên:</Text>
                                    <div><Text strong>{selectedStudent?.name || selectedStudent?.full_name || 'N/A'}</Text></div>
                                </Col>
                                
                                {/* Internship Topic - CRITICAL DISPLAY */}
                                <Col xs={24}>
                                    <Text type="secondary">Đề tài thực tập:</Text>
                                    <div>
                                        <Text strong style={{ color: '#1890ff' }}>
                                            {selectedStudent?.internship_topic || selectedStudent?.topic || 'Chưa đăng ký'}
                                        </Text>
                                    </div>
                                </Col>
                                
                                {/* Internship Unit */}
                                <Col xs={24} md={12}>
                                    <Text type="secondary"><BankOutlined /> Đơn vị thực tập:</Text>
                                    <div>
                                        <Text strong>
                                            {selectedStudent?.internship_unit || selectedStudent?.department || 'Chưa đăng ký'}
                                        </Text>
                                    </div>
                                </Col>
                                
                                {/* Time Period */}
                                <Col xs={24} md={12}>
                                    <Text type="secondary"><CalendarOutlined /> Thời gian:</Text>
                                    <div>
                                        <Text strong>
                                            {formatDate(selectedStudent?.start_date || selectedStudent?.intern_start_date)} 
                                            {' - '}
                                            {formatDate(selectedStudent?.end_date || selectedStudent?.intern_end_date)}
                                        </Text>
                                    </div>
                                </Col>
                                
                                {/* Contact Info */}
                                <Col xs={24} md={12}>
                                    <Text type="secondary"><MailOutlined /> Email:</Text>
                                    <div>{selectedStudent?.email || 'N/A'}</div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Text type="secondary"><PhoneOutlined /> SĐT:</Text>
                                    <div>{selectedStudent?.phone_number || selectedStudent?.phone || 'N/A'}</div>
                                </Col>
                                
                                {/* Documents - CRITICAL LINKS */}
                                <Col xs={24}>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <Text type="secondary">Hồ sơ đính kèm:</Text>
                                    <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        {selectedStudent?.cv_url ? (
                                            <a href={selectedStudent.cv_url} target="_blank" rel="noreferrer">
                                                <Button type="link" icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}>
                                                    📄 Xem CV
                                                </Button>
                                            </a>
                                        ) : (
                                            <Text type="secondary" italic>Chưa upload CV</Text>
                                        )}
                                        
                                        {selectedStudent?.recommendation_letter_url ? (
                                            <a href={selectedStudent.recommendation_letter_url} target="_blank" rel="noreferrer">
                                                <Button type="link" icon={<FileTextOutlined style={{ color: '#1890ff' }} />}>
                                                    📄 Xem Thư giới thiệu
                                                </Button>
                                            </a>
                                        ) : (
                                            <Text type="secondary" italic>Chưa upload thư giới thiệu</Text>
                                        )}
                                    </div>
                                </Col>
                                
                                {/* Mentor Info from Student */}
                                {(selectedStudent?.mentor_name || selectedStudent?.mentor_email) && (
                                    <Col xs={24}>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Text type="secondary">Người hướng dẫn tại DN:</Text>
                                        <div>
                                            <Text>{selectedStudent?.mentor_name || 'N/A'}</Text>
                                            {selectedStudent?.mentor_email && (
                                                <Text type="secondary"> - {selectedStudent.mentor_email}</Text>
                                            )}
                                            {selectedStudent?.mentor_phone && (
                                                <Text type="secondary"> - {selectedStudent.mentor_phone}</Text>
                                            )}
                                        </div>
                                    </Col>
                                )}
                                
                                {/* Status */}
                                <Col xs={24}>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <Text type="secondary">Trạng thái hiện tại:</Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Tag color={
                                            selectedStudent?.status === 'Chờ duyệt' ? 'orange' :
                                            selectedStudent?.status === 'Đang thực tập' ? 'blue' :
                                            selectedStudent?.status === 'Đã hoàn thành' ? 'green' :
                                            selectedStudent?.status === 'Từ chối' ? 'red' : 'default'
                                        }>
                                            {selectedStudent?.status || 'Chưa xác định'}
                                        </Tag>
                                    </div>
                                </Col>
                                
                                {/* Admin Note if exists */}
                                {selectedStudent?.admin_note && (
                                    <Col xs={24}>
                                        <Alert
                                            message="Ghi chú"
                                            description={selectedStudent.admin_note}
                                            type={selectedStudent?.status === 'Từ chối' ? 'error' : 'info'}
                                            showIcon
                                        />
                                    </Col>
                                )}
                            </Row>
                        </Card>

                        {/* ========== SECTION B: GRADING INPUT ========== */}
                        <Card 
                            size="small" 
                            title={<Text strong><CheckOutlined /> Đánh giá kết quả thực tập</Text>}
                        >
                            <Form
                                layout="vertical"
                                form={form}
                                onFinish={handleSaveEvaluation}
                            >
                                <Row gutter={16}>
                                    {/* Mentor Feedback - Renamed */}
                                    <Col xs={24}>
                                        <Form.Item 
                                            label="Đánh giá từ Doanh nghiệp (Mentor Feedback)" 
                                            name="mentor_feedback"
                                            tooltip="Nhận xét từ người hướng dẫn tại doanh nghiệp"
                                        >
                                            <Input.TextArea 
                                                rows={3} 
                                                placeholder="Nhập nhận xét từ doanh nghiệp/mentor về quá trình thực tập của sinh viên..."
                                            />
                                        </Form.Item>
                                    </Col>
                                    
                                    {/* Report Score - Renamed */}
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Điểm Báo cáo (Report Score)" 
                                            name="report_score"
                                            tooltip="Điểm cho báo cáo thực tập (0-10)"
                                        >
                                            <InputNumber 
                                                min={0} 
                                                max={10} 
                                                step={0.5}
                                                style={{ width: '100%' }} 
                                                placeholder="0 - 10"
                                            />
                                        </Form.Item>
                                    </Col>
                                    
                                    {/* Final Grade */}
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Điểm Tổng kết (Final Grade)" 
                                            name="final_grade"
                                            tooltip="Điểm tổng kết cuối cùng (0-10)"
                                        >
                                            <InputNumber 
                                                min={0} 
                                                max={10} 
                                                step={0.5}
                                                style={{ width: '100%' }} 
                                                placeholder="0 - 10"
                                            />
                                        </Form.Item>
                                    </Col>
                                    
                                    {/* Admin Note */}
                                    <Col xs={24}>
                                        <Form.Item 
                                            label="Ghi chú từ Giáo vụ" 
                                            name="admin_note"
                                        >
                                            <Input.TextArea 
                                                rows={2} 
                                                placeholder="Ghi chú nội bộ (sinh viên có thể thấy)..."
                                            />
                                        </Form.Item>
                                    </Col>
                                    
                                    {/* Completion Checkbox */}
                                    <Col xs={24}>
                                        <Form.Item name="is_completed" valuePropName="checked">
                                            <Checkbox>
                                                <Text strong style={{ color: '#52c41a' }}>
                                                    ✓ Xác nhận sinh viên ĐÃ HOÀN THÀNH thực tập (Đạt)
                                                </Text>
                                            </Checkbox>
                                        </Form.Item>
                                    </Col>
                                </Row>
                                
                                <Divider style={{ margin: '12px 0' }} />
                                
                                {/* Submit Buttons */}
                                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                                    <Space>
                                        <Button onClick={() => { setDetailVisible(false); setSelectedStudent(null); }}>
                                            Hủy
                                        </Button>
                                        <Button type="primary" htmlType="submit" loading={loading}>
                                            Lưu đánh giá
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Card>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin tip="Đang tải..." />
                    </div>
                )}
            </Modal>
        </div>
    );
}
