import { useCallback, useEffect, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { useHistory, useLocation } from 'react-router-dom';
import { 
    Table, Tag, Button, Select, Input, Modal, Descriptions, Space, Form, 
    InputNumber, Checkbox, message, Popconfirm, notification, Row, Col, 
    Divider, Card, Typography, Alert, Spin, Breadcrumb
} from 'antd';
import { 
    CheckOutlined, CloseOutlined, EyeOutlined, UserOutlined, LoadingOutlined, 
    DownloadOutlined, FilePdfOutlined, FileTextOutlined, CalendarOutlined,
    BankOutlined, BookOutlined, PhoneOutlined, MailOutlined, DeleteOutlined, EditOutlined, SearchOutlined, PlusOutlined
} from '@ant-design/icons';
import { useFetchWrapper } from '_helpers';
import { normalizeFileUrl } from '_helpers/Constant';
import { sessionExpiredAtom } from '_state';
import moment from 'moment';

const { Option } = Select;
const { Text } = Typography;
const BASE = '/api/admin';
const DATE_FORMAT = 'DD/MM/YYYY';

const formatDate = (timestamp) => {
    if (!timestamp) return 'Chưa xác định';
    return moment(timestamp).format(DATE_FORMAT);
};

const CSV_HEADERS = [
    { key: 'student_code', label: 'MSSV' },
    { key: 'full_name', label: 'Họ và tên' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'parent_number', label: 'SĐT phụ huynh' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'university', label: 'Trường' },
    { key: 'major', label: 'Ngành' },
    { key: 'class_name', label: 'Lớp' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'internship_unit', label: 'Đơn vị thực tập' },
    { key: 'internship_topic', label: 'Đề tài' },
    { key: 'mentor_name', label: 'Người hướng dẫn' },
    { key: 'report_score', label: 'Điểm báo cáo' },
    { key: 'final_grade', label: 'Điểm tổng kết' },
];

function arrayToCSV(data, headers) {
    const BOM = '\uFEFF';
    const headerRow = headers.map(h => `"${(h.label || h.key || '').replace(/"/g, '""')}"`).join(',');
    const rows = (Array.isArray(data) ? data : []).map(item => {
        const raw = item || {};
        return headers.map(h => {
            let value = raw[h.key];
            if (value === null || value === undefined) value = '';
            if (h.key === 'full_name') value = raw.full_name || raw.name || value;
            if (h.key === 'phone') value = raw.phone || raw.phone_number || value;
            if (h.key === 'parent_number') value = raw.parent_number || value;
            if (h.key === 'status') value = raw.status || raw.internship_status || raw.registration_status || value;
            if (typeof value === 'object' && value !== null && !(value instanceof Date)) value = '';
            if (value instanceof Date) value = value.toLocaleDateString('vi-VN');
            let str = String(value).replace(/"/g, '""');
            // Thêm tab đầu để Excel mở CSV không đổi SĐT thành số (tránh 8.13E+08, mất số 0 đầu)
            if ((h.key === 'phone' || h.key === 'parent_number') && str) str = '\t' + str;
            return `"${str}"`;
        }).join(',');
    }).join('\n');
    return BOM + headerRow + '\n' + rows;
}

export { AdminStudents };

function AdminStudents() {
    const history = useHistory();
    const location = useLocation();
    const fetchWrapper = useFetchWrapper();
    const setSessionExpired = useSetRecoilState(sessionExpiredAtom);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(null);
    const [deleting, setDeleting] = useState(null); // Track which student is being deleted
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
    // Sửa sinh viên
    const [editVisible, setEditVisible] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm] = Form.useForm();
    // Tìm kiếm
    const [searchKeyword, setSearchKeyword] = useState('');

    const [periodModalOpen, setPeriodModalOpen] = useState(false);
    const [newPeriod, setNewPeriod] = useState({
        name: '',
        code: '',
        startDate: '',
        endDate: '',
    });
    const [savingPeriod, setSavingPeriod] = useState(false);
    const [periodError, setPeriodError] = useState('');

    const fetchPeriods = useCallback(async () => {
        try {
            const res = await fetchWrapper.get('/api/periods');
            const data = await res.json();
            if (data.status === 'Success') {
                setPeriods(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            setPeriods([]);
        }
    }, [fetchWrapper]);

    const loadMentors = useCallback(async () => {
        try {
            const response = await fetchWrapper.get(BASE + '/mentors');
            const data = await response.json();
            if (data.status === 'Success') {
                setMentors(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            setMentors([]);
        }
    }, [fetchWrapper]);

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

    // Load students khi filter thay đổi (status từ URL) hoặc khi mount
    useEffect(() => {
        if (userData.role === 'admin') {
            loadStudents();
        }
    }, [statusFilter]);

    useEffect(() => {
        if (userData.role !== 'admin') return;
        (async () => {
            await Promise.all([fetchPeriods(), loadMentors()]);
        })();
    }, [userData.role, fetchPeriods, loadMentors]);

    async function loadStudents() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (majorFilter) params.append('major', majorFilter);
            if (universityFilter) params.append('university', universityFilter);
            if (periodFilter) params.append('period_id', periodFilter);
            if (searchKeyword && searchKeyword.trim()) params.append('search', searchKeyword.trim());
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
        setSearchKeyword('');
        history.push('/admin/students');
        loadStudents();
    }

    function openCreatePeriodModal() {
        setPeriodError('');
        setNewPeriod({
            name: '',
            code: '',
            startDate: '',
            endDate: '',
        });
        setPeriodModalOpen(true);
    }

    function closeCreatePeriodModal() {
        setPeriodModalOpen(false);
        setSavingPeriod(false);
    }

    function handlePeriodFieldChange(field, value) {
        setNewPeriod(prev => ({
            ...prev,
            [field]: value,
        }));
    }

    async function handleCreatePeriod() {
        if (!newPeriod.name.trim() || !newPeriod.startDate || !newPeriod.endDate) {
            setPeriodError('Vui lòng nhập đầy đủ Tên đợt, Ngày bắt đầu và Ngày kết thúc');
            return;
        }
        setSavingPeriod(true);
        setPeriodError('');
        try {
            const payload = {
                name: newPeriod.name.trim(),
                code: newPeriod.code ? newPeriod.code.trim() : undefined,
                startDate: newPeriod.startDate,
                endDate: newPeriod.endDate,
            };

            const res = await fetchWrapper.post('/api/periods', 'application/json', payload);
            const data = await res.json();
            if (data.status === 'Success') {
                message.success('Tạo đợt thực tập thành công');
                closeCreatePeriodModal();
                await fetchPeriods();
            } else {
                throw new Error(data.message || 'Không thể tạo đợt thực tập');
            }
        } catch (error) {
            setPeriodError(error?.message || 'Không thể tạo đợt thực tập');
        } finally {
            setSavingPeriod(false);
        }
    }

    function exportToCSV() {
        try {
            message.loading({ content: 'Đang xuất file CSV...', key: 'exportCSV' });
            const csvString = arrayToCSV(students, CSV_HEADERS);
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Danh_sach_sinh_vien_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            message.success({ content: 'Xuất CSV thành công!', key: 'exportCSV' });
        } catch (error) {
            message.error({ content: error.message || 'Có lỗi xảy ra khi xuất CSV', key: 'exportCSV' });
        } finally {
            message.destroy('exportCSV');
        }
    }

    function openDetail(record) {
        if (!record) return;
        setSelectedStudent(record);
        setDetailVisible(true);
        // Reset form with correct field names (matching the new evaluation form)
        form.setFieldsValue({
            internship_status: record?.status || record?.internship_status || '',
            period_id: record?.internship_period_id || undefined,
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

    function openEdit(record) {
        if (!record) return;
        setEditTarget(record);
        editForm.setFieldsValue({
            full_name: record.full_name || record.name,
            email: record.email || '',
            phone: record.phone || record.phone_number || '',
            parent_number: record.parent_number || '',
            address: record.address || '',
            university: record.university || '',
            major: record.major || '',
            class_name: record.class_name || '',
            status: record.status || record.internship_status || record.registration_status,
        });
        setEditVisible(true);
    }

    async function handleEditSubmit() {
        if (!editTarget) return;
        try {
            setEditLoading(true);
            const values = await editForm.validateFields();
            const payload = {
                full_name: values.full_name,
                email: values.email,
                phone: values.phone || null,
                parent_number: values.parent_number || null,
                address: values.address || null,
                university: values.university || null,
                major: values.major || null,
                class_name: values.class_name || null,
                status: values.status || null,
            };
            if (payload.status) {
                payload.internship_status = payload.status;
                payload.registration_status = payload.status;
            }
            const res = await fetchWrapper.put(
                `${BASE}/students/${editTarget.student_code}`,
                'application/json',
                payload
            );
            const data = await res.json();
            if (data.status === 'Success') {
                notification.success({
                    message: 'Cập nhật thành công',
                    description: `Đã cập nhật thông tin ${values.full_name}`,
                    placement: 'topRight',
                });
                setEditVisible(false);
                setEditTarget(null);
                editForm.resetFields();
                await loadStudents();
                if (selectedStudent?._id === editTarget._id) {
                    setSelectedStudent(prev => prev ? { ...prev, ...payload, name: payload.full_name } : null);
                }
            } else {
                throw new Error(data.message || 'Cập nhật thất bại');
            }
        } catch (error) {
            notification.error({
                message: 'Lỗi',
                description: error.message || 'Không thể cập nhật sinh viên',
                placement: 'topRight',
            });
        } finally {
            setEditLoading(false);
        }
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
                    internship_status: values.internship_status || undefined,
                    period_id: values.period_id || undefined,
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
                setSelectedStudent(null);
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

    async function handleDelete(record) {
        try {
            setDeleting(record._id);
            const res = await fetchWrapper.delete(`${BASE}/students/${record.student_code}`);
            const data = await res.json();
            if (data.status === 'Success') {
                notification.success({
                    message: 'Đã xóa',
                    description: `Đã xóa sinh viên ${record.name || record.full_name} (${record.student_code})`,
                    placement: 'topRight'
                });
                await loadStudents();
                if (selectedStudent?._id === record._id) setDetailVisible(false);
            } else {
                throw new Error(data.message || 'Không thể xóa');
            }
        } catch (error) {
            notification.error({
                message: 'Lỗi',
                description: error.message || 'Không thể xóa sinh viên',
                placement: 'topRight'
            });
        } finally {
            setDeleting(null);
        }
    }

    const columns = [
        { title: 'MSSV', dataIndex: 'student_code', key: 'student_code', width: 100, align: 'center' },
        { 
            title: 'Họ và tên', 
            dataIndex: 'name', 
            key: 'name',
            align: 'left',
            render: (text, record) => (
                <span>
                    <UserOutlined style={{ marginRight: 8 }} />
                    {text || record.full_name}
                </span>
            )
        },
        { title: 'Trường', dataIndex: 'university', key: 'university', ellipsis: true, align: 'left' },
        { title: 'Ngành', dataIndex: 'major', key: 'major', ellipsis: true, align: 'left' },
        { 
            title: 'Đợt thực tập', 
            dataIndex: 'internship_period', 
            key: 'internship_period', 
            width: 140,
            ellipsis: true,
            align: 'left',
            render: (v) => v || '—'
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            align: 'center',
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
            align: 'center',
            render: (_, record) => (
                <Space wrap size="small">
                    <Button 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    >
                        Chi tiết
                    </Button>
                    <Button 
                        size="small" 
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    >
                        Sửa
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

                    {/* Nút Xóa - có xác nhận */}
                    <Popconfirm
                        title="Xóa sinh viên"
                        description={`Bạn có chắc muốn xóa ${record.name || record.full_name} (${record.student_code})? Hành động không thể hoàn tác.`}
                        onConfirm={() => handleDelete(record)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true, loading: deleting === record._id }}
                    >
                        <Button
                            size="small"
                            danger
                            icon={deleting === record._id ? <LoadingOutlined /> : <DeleteOutlined />}
                            loading={deleting === record._id}
                        >
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="container mt-3" style={{ maxWidth: 1400, margin: '0 auto', paddingTop: 24 }}>
            <Breadcrumb style={{ marginBottom: 16, fontSize: 13, color: '#8c8c8c' }}>
                <Breadcrumb.Item><span style={{ cursor: 'pointer', color: '#8c8c8c' }} onClick={() => history.push('/')}>Trang chủ</span></Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý sinh viên</Breadcrumb.Item>
            </Breadcrumb>

            <div style={{ 
                marginBottom: 16, 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'flex-end', 
                gap: 10 
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                    <Input
                        placeholder="Tìm theo tên, MSSV, email..."
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        style={{ width: 240 }}
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        onPressEnter={() => loadStudents()}
                        allowClear
                    />
                    <Select
                        allowClear
                        placeholder="Trạng thái"
                        style={{ width: 150 }}
                        value={statusFilter}
                        onChange={(val) => {
                            setStatusFilter(val);
                            if (val) history.push(`/admin/students?status=${encodeURIComponent(val)}`);
                            else history.push('/admin/students');
                        }}
                    >
                        <Option value="Chờ duyệt">Chờ duyệt</Option>
                        <Option value="Đang thực tập">Đang thực tập</Option>
                        <Option value="Đã hoàn thành">Đã hoàn thành</Option>
                        <Option value="Từ chối">Từ chối</Option>
                    </Select>
                    <Input
                        placeholder="Trường"
                        style={{ width: 140 }}
                        value={universityFilter}
                        onChange={e => setUniversityFilter(e.target.value)}
                    />
                    <Input
                        placeholder="Ngành"
                        style={{ width: 120 }}
                        value={majorFilter}
                        onChange={e => setMajorFilter(e.target.value)}
                    />
                    <Select
                        allowClear
                        placeholder="Đợt thực tập"
                        style={{ width: 160 }}
                        value={periodFilter}
                        onChange={setPeriodFilter}
                        notFoundContent={periods.length === 0 ? 'Chưa có đợt' : null}
                    >
                        {periods.map(p => (
                            <Option key={String(p._id)} value={p._id}>{p.name || p.code || p._id}</Option>
                        ))}
                    </Select>
                    <Button 
                        type="dashed" 
                        shape="circle" 
                        icon={<PlusOutlined />} 
                        onClick={openCreatePeriodModal}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Button type="primary" onClick={loadStudents}>Lọc</Button>
                    <Button onClick={clearFilters}>Xóa bộ lọc</Button>
                    <Button icon={<DownloadOutlined />} onClick={exportToCSV}>Xuất CSV</Button>
                </div>
            </div>

            {/* Hiển thị filter đang active */}
            {(statusFilter || searchKeyword?.trim()) && (
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {statusFilter && (
                        <Tag color="blue" closable onClose={() => { setStatusFilter(undefined); history.push('/admin/students'); }}>
                            Trạng thái: {statusFilter}
                        </Tag>
                    )}
                    {searchKeyword?.trim() && (
                        <Tag color="green" closable onClose={() => setSearchKeyword('')}>
                            Tìm: &quot;{searchKeyword.trim()}&quot;
                        </Tag>
                    )}
                </div>
            )}

            {/* Modal Sửa sinh viên */}
            <Modal
                title={
                    <span>
                        <EditOutlined style={{ marginRight: 8 }} />
                        Sửa thông tin sinh viên
                    </span>
                }
                visible={editVisible}
                onCancel={() => { setEditVisible(false); setEditTarget(null); editForm.resetFields(); }}
                footer={null}
                width={560}
                destroyOnClose
            >
                {editTarget && (
                    <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleEditSubmit}
                    >
                        <Form.Item label="MSSV">
                            <Input value={editTarget.student_code} disabled style={{ background: '#f5f5f5' }} />
                        </Form.Item>
                        <Form.Item 
                            name="full_name" 
                            label="Họ và tên" 
                            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
                        </Form.Item>
                        <Form.Item 
                            name="email" 
                            label="Email" 
                            rules={[
                                { required: true, message: 'Vui lòng nhập email' },
                                { type: 'email', message: 'Email không hợp lệ' }
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email" />
                        </Form.Item>
                        <Form.Item name="phone" label="Số điện thoại">
                            <Input prefix={<PhoneOutlined />} placeholder="SĐT" />
                        </Form.Item>
                        <Form.Item name="parent_number" label="SĐT phụ huynh">
                            <Input prefix={<PhoneOutlined />} placeholder="SĐT phụ huynh" />
                        </Form.Item>
                        <Form.Item name="address" label="Địa chỉ">
                            <Input placeholder="Địa chỉ liên hệ" />
                        </Form.Item>
                        <Form.Item name="university" label="Trường">
                            <Input placeholder="Trường" />
                        </Form.Item>
                        <Form.Item name="major" label="Ngành">
                            <Input placeholder="Ngành" />
                        </Form.Item>
                        <Form.Item name="class_name" label="Lớp">
                            <Input placeholder="Lớp" />
                        </Form.Item>
                        <Form.Item name="status" label="Trạng thái">
                            <Select allowClear placeholder="Chọn trạng thái" style={{ width: '100%' }}>
                                <Option value="Chờ duyệt">Chờ duyệt</Option>
                                <Option value="Đang thực tập">Đang thực tập</Option>
                                <Option value="Đã hoàn thành">Đã hoàn thành</Option>
                                <Option value="Từ chối">Từ chối</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                            <Space>
                                <Button onClick={() => { setEditVisible(false); setEditTarget(null); editForm.resetFields(); }}>
                                    Hủy
                                </Button>
                                <Button type="primary" htmlType="submit" loading={editLoading}>
                                    Lưu thay đổi
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                )}
            </Modal>

            <Table
                className="admin-students-table"
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
                                <Col xs={24} md={12}>
                                    <Text type="secondary"><CalendarOutlined /> Đợt thực tập:</Text>
                                    <div>
                                        <Text strong>
                                            {selectedStudent?.internship_period || 'Chưa chọn đợt'}
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
                                <Col xs={24} md={12}>
                                    <Text type="secondary"><PhoneOutlined /> SĐT phụ huynh:</Text>
                                    <div>{selectedStudent?.parent_number || 'Chưa cập nhật'}</div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Text type="secondary">Địa chỉ:</Text>
                                    <div>{selectedStudent?.address || 'Chưa cập nhật'}</div>
                                </Col>
                                
                                {/* Documents - CRITICAL LINKS */}
                                <Col xs={24}>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <Text type="secondary">Hồ sơ đính kèm:</Text>
                                    <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        {selectedStudent?.cv_url ? (
                                            <a href={normalizeFileUrl(selectedStudent.cv_url)} target="_blank" rel="noreferrer">
                                                <Button type="link" icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}>
                                                    📄 Xem CV
                                                </Button>
                                            </a>
                                        ) : (
                                            <Text type="secondary" italic>Chưa upload CV</Text>
                                        )}
                                        
                                        {selectedStudent?.recommendation_letter_url ? (
                                            <a href={normalizeFileUrl(selectedStudent.recommendation_letter_url)} target="_blank" rel="noreferrer">
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
                                    {/* Trạng thái + Đợt thực tập - Có thể sửa trực tiếp */}
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Trạng thái thực tập" 
                                            name="internship_status"
                                            tooltip="Chỉnh sửa trạng thái hồ sơ sinh viên"
                                        >
                                            <Select placeholder="Chọn trạng thái" allowClear>
                                                <Option value="Chờ duyệt">Chờ duyệt</Option>
                                                <Option value="Đang thực tập">Đang thực tập</Option>
                                                <Option value="Đã hoàn thành">Đã hoàn thành</Option>
                                                <Option value="Từ chối">Từ chối</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Đợt thực tập" 
                                            name="period_id"
                                            tooltip="Gán hoặc đổi đợt thực tập cho sinh viên"
                                        >
                                            <Select placeholder="Chọn đợt" allowClear showSearch optionFilterProp="children">
                                                {periods.map(p => (
                                                    <Option key={String(p._id)} value={p._id}>{p.name || p.code || p._id}</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
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

            {periodModalOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-gray-900 bg-opacity-40 transition-opacity"
                        onClick={closeCreatePeriodModal}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-gray-100">
                            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    Tạo đợt thực tập
                                </h3>
                                <button
                                    type="button"
                                    onClick={closeCreatePeriodModal}
                                    className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <span className="sr-only">Đóng</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form
                                className="space-y-4 px-5 py-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCreatePeriod();
                                }}
                            >
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Tên đợt <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newPeriod.name}
                                        onChange={(e) => handlePeriodFieldChange('name', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="VD: Đợt Thu 2025"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Mã đợt (tùy chọn)
                                    </label>
                                    <input
                                        type="text"
                                        value={newPeriod.code}
                                        onChange={(e) => handlePeriodFieldChange('code', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
                                        placeholder="VD: 2025-FALL"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Ngày bắt đầu <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={newPeriod.startDate}
                                            onChange={(e) => handlePeriodFieldChange('startDate', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Ngày kết thúc <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={newPeriod.endDate}
                                            onChange={(e) => handlePeriodFieldChange('endDate', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>
                                </div>

                                {periodError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                        {periodError}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeCreatePeriodModal}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                                        disabled={savingPeriod}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={savingPeriod}
                                    >
                                        {savingPeriod && (
                                            <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                        )}
                                        Tạo đợt
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
