import { Link } from 'react-router-dom';
import { getUserData } from '_helpers/auth-storage';
import { useRecoilValue } from 'recoil';
import { useEffect, useState } from 'react';
import {
    Card, Row, Col, Tag, Spin, Button, Divider, Avatar, Statistic, 
    Progress, Tabs, Timeline, Descriptions, Steps, Breadcrumb
} from 'antd';
import {
    UserOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    TrophyOutlined,
    FileTextOutlined,
    TeamOutlined,
    CalendarOutlined,
    LogoutOutlined,
    EditOutlined,
    AuditOutlined,
    SolutionOutlined,
    StarOutlined,
    SafetyCertificateOutlined,
    HomeOutlined,
    FormOutlined,
    BarChartOutlined,
    HistoryOutlined,
    MailOutlined,
    PhoneOutlined,
    BankOutlined,
    BookOutlined,
    LinkOutlined,
    FilePdfOutlined,
    CheckOutlined,
    LoadingOutlined,
    SyncOutlined
} from '@ant-design/icons';
import { useUserActions, useProfileAction } from '_actions';
import { profileAtom } from '_state';
import { useFetchWrapper } from '_helpers';
import { normalizeFileUrl } from '_helpers/Constant';

const { TabPane } = Tabs;
const { Step } = Steps;

export { Home };

// ==================== HELPER FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getStatusInfo(status) {
    switch (status) {
        case "Chờ duyệt":
            return { color: "#faad14", bgColor: "#fffbe6", borderColor: "#ffe58f", text: "Hồ sơ đang chờ duyệt", icon: <ClockCircleOutlined />, step: 1 };
        case "Đang thực tập":
            return { color: "#52c41a", bgColor: "#f6ffed", borderColor: "#b7eb8f", text: "Đang thực tập", icon: <CheckCircleOutlined />, step: 2 };
        case "Đã hoàn thành":
            return { color: "#1890ff", bgColor: "#e6f7ff", borderColor: "#91d5ff", text: "Đã hoàn thành", icon: <TrophyOutlined />, step: 3 };
        case "Từ chối":
            return { color: "#ff4d4f", bgColor: "#fff2f0", borderColor: "#ffccc7", text: "Hồ sơ bị từ chối", icon: <ExclamationCircleOutlined />, step: -1 };
        default:
            return { color: "#d9d9d9", bgColor: "#fafafa", borderColor: "#d9d9d9", text: "Chưa đăng ký", icon: <UserOutlined />, step: 0 };
    }
}

function getFinalStatusInfo(finalStatus) {
    switch (finalStatus) {
        case "Đạt":
            return { color: "#52c41a", text: "ĐẠT", icon: <SafetyCertificateOutlined /> };
        case "Không đạt":
            return { color: "#ff4d4f", text: "KHÔNG ĐẠT", icon: <ExclamationCircleOutlined /> };
        default:
            return { color: "#faad14", text: "Đang chờ", icon: <ClockCircleOutlined /> };
    }
}

/** Format thời gian tương đối cho hoạt động (vd: "5 phút trước", "Hôm nay, 10:30") */
function formatTimeAgo(dateString) {
    if (!dateString) return "Vừa xong";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
        return `Hôm nay, ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Map loại hoạt động -> icon + màu nền (dùng cho Hoạt động gần đây) */
function getActivityStyle(type) {
    switch (type) {
        case "profile_update":
        case "registration":
            return { icon: <UserOutlined />, iconBg: "#e6f7ff" };
        case "report_submit":
            return { icon: <FileTextOutlined />, iconBg: "#f6ffed" };
        case "evaluation":
        case "approval":
            return { icon: <CheckCircleOutlined />, iconBg: "#e6fffb" };
        case "import":
        case "system":
            return { icon: <SyncOutlined />, iconBg: "#f5f5f5" };
        default:
            return { icon: <HistoryOutlined />, iconBg: "#f9f0ff" };
    }
}

// ==================== CUSTOM TAB STYLES ====================
const tabStyles = `
    .custom-tabs .ant-tabs-tab {
        padding: 12px 24px;
        font-size: 15px;
        transition: all 0.3s;
    }
    .custom-tabs .ant-tabs-tab:hover {
        color: #1890ff;
    }
    .custom-tabs .ant-tabs-tab-active {
        background: #e6f7ff;
        border-radius: 8px 8px 0 0;
    }
    .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
        color: #1890ff;
        font-weight: 600;
    }
    .custom-tabs .ant-tabs-ink-bar {
        background: #1890ff;
        height: 3px;
    }
    .custom-tabs .ant-tabs-content {
        padding: 24px 0;
    }
    .info-card {
        background: #fafafa;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
    }
    .info-card-title {
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .score-circle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
        color: white;
        font-size: 32px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
    }
    .timeline-item {
        padding: 12px 16px;
        background: #fafafa;
        border-radius: 8px;
        margin-bottom: 8px;
    }
`;

// ==================== MAIN COMPONENT ====================

function Home() {
    const profile = useRecoilValue(profileAtom);
    const [loading, setLoading] = useState(true);
    const [adminStats, setAdminStats] = useState({ pending: 0, total: 0, interning: 0, completed: 0 });
    const [recentActivities, setRecentActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("1");
    const profileAction = useProfileAction();
    const userActions = useUserActions();
    const fetchWrapper = useFetchWrapper();
    const userData = getUserData();

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                await profileAction.getMyProfile();
                
                // Nếu là admin, load thêm thống kê và hoạt động gần đây
                if (userData.role === "admin") {
                    try {
                        const response = await fetchWrapper.get("/api/admin/stats");
                        if (response && response.ok) {
                            const data = await response.json();
                            if (data.status === "Success") {
                                setAdminStats(data.data);
                            }
                        }
                    } catch (e) {
                        console.log("Không thể tải thống kê admin");
                    }
                    setActivitiesLoading(true);
                    try {
                        const actRes = await fetchWrapper.get("/api/activities/recent?limit=20");
                        if (actRes && actRes.ok) {
                            const actData = await actRes.json();
                            if (actData.status === "Success" && Array.isArray(actData.data)) {
                                setRecentActivities(actData.data);
                            }
                        }
                    } catch (e) {
                        console.log("Không thể tải hoạt động gần đây");
                    }
                    setActivitiesLoading(false);
                }
            } catch (e) {
                console.error("Lỗi tải dữ liệu:", e);
            }
            setLoading(false);
        }
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Inject custom styles
    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.innerHTML = tabStyles;
        document.head.appendChild(styleEl);
        return () => document.head.removeChild(styleEl);
    }, []);

    // Lấy status từ profile hoặc userData (hỗ trợ cả 2 field name)
    const status = profile?.internship_status || profile?.registration_status || userData?.internship_status || userData?.registration_status || null;

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" tip="Đang tải thông tin..." />
            </div>
        );
    }

    // ==================== ADMIN DASHBOARD ====================
    if (userData.role === "admin") {
        return (
            <div className="p-4" style={{ paddingTop: 24 }}>
                <div className="container">
                    <Breadcrumb style={{ marginBottom: 16, fontSize: 13, color: '#8c8c8c' }}>
                        <Breadcrumb.Item>Trang chủ</Breadcrumb.Item>
                    </Breadcrumb>
                    <h2 style={{ marginBottom: 8, fontSize: 20 }}>
                        <AuditOutlined /> Bảng điều khiển Giáo vụ
                    </h2>
                    <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Quản lý và theo dõi sinh viên thực tập</p>
                    <Divider />

                    {/* Admin Stats Cards with Deep Linking */}
                    <Row gutter={[24, 24]}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card 
                                hoverable
                                style={{ 
                                    background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
                                    borderLeft: '4px solid #faad14'
                                }}
                            >
                                <Statistic
                                    title={<span style={{ fontSize: 14 }}><ClockCircleOutlined /> Chờ duyệt</span>}
                                    value={adminStats.pending || 0}
                                    valueStyle={{ color: '#faad14', fontSize: 32 }}
                                />
                                {/* TASK 1: Deep Link với query param status=pending */}
                                <Link to="/admin/students?status=Chờ duyệt">
                                    <Button type="primary" size="small" style={{ marginTop: 12, background: '#faad14', borderColor: '#faad14' }}>
                                        Duyệt ngay
                                    </Button>
                                </Link>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card 
                                hoverable
                                style={{ 
                                    background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                                    borderLeft: '4px solid #52c41a'
                                }}
                            >
                                <Statistic
                                    title={<span style={{ fontSize: 14 }}><CheckCircleOutlined /> Đang thực tập</span>}
                                    value={adminStats.interning || 0}
                                    valueStyle={{ color: '#52c41a', fontSize: 32 }}
                                />
                                {/* TASK 1: Deep Link với query param status=interning */}
                                <Link to="/admin/students?status=Đang thực tập">
                                    <Button size="small" style={{ marginTop: 12 }}>
                                        Theo dõi
                                    </Button>
                                </Link>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card 
                                hoverable
                                style={{ 
                                    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                                    borderLeft: '4px solid #1890ff'
                                }}
                            >
                                <Statistic
                                    title={<span style={{ fontSize: 14 }}><TrophyOutlined /> Đã hoàn thành</span>}
                                    value={adminStats.completed || 0}
                                    valueStyle={{ color: '#1890ff', fontSize: 32 }}
                                />
                                <Link to="/admin/students?status=Đã hoàn thành">
                                    <Button size="small" style={{ marginTop: 12 }}>
                                        Xem kết quả
                                    </Button>
                                </Link>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card 
                                hoverable
                                style={{ 
                                    background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
                                    borderLeft: '4px solid #722ed1'
                                }}
                            >
                                <Statistic
                                    title={<span style={{ fontSize: 14 }}><TeamOutlined /> Tổng sinh viên</span>}
                                    value={adminStats.total || 0}
                                    valueStyle={{ color: '#722ed1', fontSize: 32 }}
                                />
                                <Link to="/admin/students">
                                    <Button size="small" style={{ marginTop: 12 }}>
                                        Xem tất cả
                                    </Button>
                                </Link>
                            </Card>
                        </Col>
                    </Row>

                    <Divider />

                    {/* Recent Activities - dữ liệu thật từ API */}
                    <h4 style={{ marginBottom: 16 }}><HistoryOutlined /> Hoạt động gần đây</h4>
                    <Card style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }} bodyStyle={{ padding: 0 }}>
                        {activitiesLoading ? (
                            <div style={{ padding: 32, textAlign: 'center' }}>
                                <Spin tip="Đang tải hoạt động..." />
                            </div>
                        ) : recentActivities.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: '#8c8c8c' }}>
                                Chưa có hoạt động nào gần đây.
                            </div>
                        ) : (
                            recentActivities.map((item, idx) => {
                                const style = getActivityStyle(item.type);
                                return (
                                    <div
                                        key={item._id || idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '14px 20px',
                                            borderBottom: idx < recentActivities.length - 1 ? '1px solid #f0f0f0' : 'none',
                                            gap: 14,
                                        }}
                                    >
                                        <Avatar
                                            size={40}
                                            icon={style.icon}
                                            style={{ backgroundColor: style.iconBg, color: '#1890ff', flexShrink: 0 }}
                                        />
                                        <div style={{ flex: 1, fontSize: 14, color: '#262626', lineHeight: 1.5 }}>
                                            {item.actor_name && item.title.includes(item.actor_name) ? (
                                                <>
                                                    {item.title.split(item.actor_name)[0]}
                                                    <strong>{item.actor_name}</strong>
                                                    {item.title.split(item.actor_name)[1]}
                                                </>
                                            ) : (
                                                item.title
                                            )}
                                            {item.description && (
                                                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{item.description}</div>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 12, color: '#8c8c8c', flexShrink: 0 }}>{formatTimeAgo(item.createdAt)}</span>
                                    </div>
                                );
                            })
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    // ==================== STUDENT DASHBOARD - TABBED INTERFACE ====================
    const statusInfo = getStatusInfo(status);
    const user = profile || userData || {};

    // Tính progress step cho timeline
    const getCurrentStep = () => {
        if (!status || status === "") return 0;
        if (status === "Chờ duyệt") return 1;
        if (status === "Đang thực tập") return 2;
        if (status === "Đã hoàn thành") return 3;
        return 0;
    };

    return (
        <div className="p-4" style={{ paddingTop: 24 }}>
            <div className="container">
                <Breadcrumb style={{ marginBottom: 16, fontSize: 13, color: '#8c8c8c' }}>
                    <Breadcrumb.Item>Trang chủ</Breadcrumb.Item>
                </Breadcrumb>
                {/* Header với Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>
                        <SolutionOutlined /> Bảng theo dõi thực tập
                    </h2>
                    <Tag 
                        color={statusInfo.color} 
                        style={{ fontSize: 14, padding: '4px 16px' }}
                        icon={statusInfo.icon}
                    >
                        {statusInfo.text}
                    </Tag>
                </div>

                {/* Progress Steps */}
                <Card style={{ marginBottom: 24 }}>
                    <Steps current={getCurrentStep()} size="small">
                        <Step title="Đăng ký" icon={<FormOutlined />} />
                        <Step title="Chờ duyệt" icon={getCurrentStep() === 1 ? <LoadingOutlined /> : <ClockCircleOutlined />} />
                        <Step title="Thực tập" icon={<BookOutlined />} />
                        <Step title="Hoàn thành" icon={<TrophyOutlined />} />
                    </Steps>
                </Card>

                {/* TASK 2: Tabbed Interface */}
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    className="custom-tabs"
                    type="card"
                    size="large"
                >
                    {/* ==================== TAB 1: Tổng quan ==================== */}
                    <TabPane 
                        tab={<span><HomeOutlined /> Tổng quan</span>} 
                        key="1"
                    >
                        <Row gutter={[24, 24]}>
                            {/* Thông tin cá nhân */}
                            <Col xs={24} md={12}>
                                <Card 
                                    title={<><UserOutlined /> Thông tin cá nhân</>}
                                    extra={<Link to="/profile"><Button type="link" icon={<EditOutlined />}>Chỉnh sửa</Button></Link>}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
                                        <Avatar 
                                            size={80} 
                                            icon={<UserOutlined />} 
                                            style={{ backgroundColor: '#1890ff', marginRight: 20, flexShrink: 0 }} 
                                        />
                                        <div>
                                            <h2 style={{ margin: 0 }}>{user.full_name || user.name || "Chưa cập nhật"}</h2>
                                            <Tag color="blue" style={{ marginTop: 8, fontSize: 14 }}>
                                                {user.student_code || "N/A"}
                                            </Tag>
                                        </div>
                                    </div>
                                    <Divider />
                                    <Row gutter={[16, 12]}>
                                        <Col span={12}>
                                            <div className="info-card">
                                                <div className="info-card-title"><BankOutlined /> Trường</div>
                                                <div>{user.university || "Chưa cập nhật"}</div>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div className="info-card">
                                                <div className="info-card-title"><BookOutlined /> Ngành</div>
                                                <div>{user.major || "Chưa cập nhật"}</div>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div className="info-card">
                                                <div className="info-card-title"><MailOutlined /> Email</div>
                                                <div>{user.email || "Chưa cập nhật"}</div>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div className="info-card">
                                                <div className="info-card-title"><PhoneOutlined /> Điện thoại</div>
                                                <div>{user.phone || user.phone_number || "Chưa cập nhật"}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>

                            {/* Trạng thái hiện tại */}
                            <Col xs={24} md={12}>
                                <Card 
                                    title={<><CalendarOutlined /> Trạng thái hiện tại</>}
                                    style={{ height: '100%' }}
                                >
                                    <div style={{ 
                                        textAlign: 'center', 
                                        padding: '24px',
                                        background: statusInfo.bgColor,
                                        borderRadius: 12,
                                        border: `2px solid ${statusInfo.borderColor}`,
                                        marginBottom: 20
                                    }}>
                                        <div style={{ fontSize: 48, color: statusInfo.color }}>
                                            {statusInfo.icon}
                                        </div>
                                        <h2 style={{ color: statusInfo.color, margin: '12px 0 0 0' }}>
                                            {statusInfo.text}
                                        </h2>
                                    </div>

                                    {/* Quick Info based on status */}
                                    {status === "Đang thực tập" && (
                                        <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8 }}>
                                            <p style={{ margin: '4px 0' }}><strong>Đơn vị:</strong> {user.internship_unit || "Chưa cập nhật"}</p>
                                            <p style={{ margin: '4px 0' }}><strong>Mentor:</strong> {user.mentor_name || "Chưa phân công"}</p>
                                            <p style={{ margin: '4px 0' }}><strong>Thời gian:</strong> {formatDate(user.start_date)} - {formatDate(user.end_date)}</p>
                                        </div>
                                    )}

                                    {(!status || status === "") && (
                                        <Link to="/profile">
                                            <Button type="primary" block size="large" icon={<FormOutlined />}>
                                                Đăng ký thực tập ngay
                                            </Button>
                                        </Link>
                                    )}

                                    {status === "Từ chối" && (
                                        <div style={{ background: '#fff2f0', padding: 16, borderRadius: 8 }}>
                                            <p style={{ color: '#ff4d4f', margin: 0 }}>
                                                <strong>Lý do:</strong> {user.admin_note || "Vui lòng liên hệ Giáo vụ"}
                                            </p>
                                            <Link to="/profile">
                                                <Button type="primary" danger block style={{ marginTop: 12 }}>
                                                    Cập nhật và đăng ký lại
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </Card>
                            </Col>
                        </Row>
                    </TabPane>

                    {/* ==================== TAB 2: Đăng ký & Hồ sơ ==================== */}
                    <TabPane 
                        tab={<span><FormOutlined /> Đăng ký & Hồ sơ</span>} 
                        key="2"
                    >
                        <Row gutter={[24, 24]}>
                            {/* Thông tin đăng ký */}
                            <Col xs={24} md={12}>
                                <Card title={<><FileTextOutlined /> Thông tin đăng ký thực tập</>}>
                                    <Descriptions bordered column={1} size="small">
                                        <Descriptions.Item label={<><BookOutlined /> Đề tài</>}>
                                            <strong>{user.internship_topic || "Chưa đăng ký"}</strong>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<><BankOutlined /> Đơn vị thực tập</>}>
                                            {user.internship_unit || user.department || "Chưa đăng ký"}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<><CalendarOutlined /> Kỳ thực tập</>}>
                                            {user.internship_period || "Chưa xác định"}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<><CalendarOutlined /> Thời gian</>}>
                                            {formatDate(user.start_date)} - {formatDate(user.end_date)}
                                        </Descriptions.Item>
                                    </Descriptions>

                                    {status === "Chờ duyệt" && (
                                        <div style={{ marginTop: 16, padding: 16, background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f' }}>
                                            <p style={{ margin: 0, color: '#d48806' }}>
                                                <ClockCircleOutlined /> Hồ sơ đang chờ Giáo vụ phê duyệt. Bạn có thể chỉnh sửa đề tài nếu cần.
                                            </p>
                                            <Link to="/profile">
                                                <Button type="dashed" style={{ marginTop: 12 }} icon={<EditOutlined />}>
                                                    Chỉnh sửa hồ sơ
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </Card>
                            </Col>

                            {/* Hồ sơ đính kèm */}
                            <Col xs={24} md={12}>
                                <Card title={<><LinkOutlined /> Hồ sơ đính kèm</>}>
                                    <div className="info-card">
                                        <div className="info-card-title"><FilePdfOutlined /> CV / Sơ yếu lý lịch</div>
                                        {user.cv_url ? (
                                            <a href={normalizeFileUrl(user.cv_url)} target="_blank" rel="noreferrer">
                                                <Button type="link" icon={<LinkOutlined />}>Xem CV</Button>
                                            </a>
                                        ) : (
                                            <Tag color="default">Chưa upload</Tag>
                                        )}
                                    </div>
                                    <div className="info-card">
                                        <div className="info-card-title"><FileTextOutlined /> Thư giới thiệu</div>
                                        {user.recommendation_letter_url ? (
                                            <a href={normalizeFileUrl(user.recommendation_letter_url)} target="_blank" rel="noreferrer">
                                                <Button type="link" icon={<LinkOutlined />}>Xem thư giới thiệu</Button>
                                            </a>
                                        ) : (
                                            <Tag color="default">Chưa upload</Tag>
                                        )}
                                    </div>
                                    <Divider />
                                    <Link to="/profile">
                                        <Button type="primary" block icon={<EditOutlined />}>
                                            Cập nhật hồ sơ
                                        </Button>
                                    </Link>
                                </Card>

                                {/* Thông tin người hướng dẫn */}
                                {(status === "Đang thực tập" || status === "Đã hoàn thành") && (
                                    <Card title={<><TeamOutlined /> Người hướng dẫn</>} style={{ marginTop: 16 }}>
                                        <div className="info-card">
                                            <div className="info-card-title"><UserOutlined /> Họ tên</div>
                                            <div>{user.mentor_name || "Chưa phân công"}</div>
                                        </div>
                                        {user.mentor_email && (
                                            <div className="info-card">
                                                <div className="info-card-title"><MailOutlined /> Email</div>
                                                <div>{user.mentor_email}</div>
                                            </div>
                                        )}
                                        {user.mentor_phone && (
                                            <div className="info-card">
                                                <div className="info-card-title"><PhoneOutlined /> Điện thoại</div>
                                                <div>{user.mentor_phone}</div>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </Col>
                        </Row>
                    </TabPane>

                    {/* ==================== TAB 3: Kết quả chi tiết ==================== */}
                    <TabPane 
                        tab={<span><BarChartOutlined /> Kết quả chi tiết</span>} 
                        key="3"
                    >
                        {status === "Đã hoàn thành" ? (
                            <Row gutter={[24, 24]}>
                                {/* Kết quả đánh giá */}
                                <Col xs={24} lg={16}>
                                    <Card title={<><TrophyOutlined /> Kết quả đánh giá thực tập</>}>
                                        {/* Điểm số */}
                                        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                                            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                                                <div style={{ marginBottom: 8, color: '#666' }}>Điểm Báo cáo</div>
                                                <div className="score-circle">
                                                    {user.report_score !== undefined && user.report_score !== null 
                                                        ? user.report_score 
                                                        : "N/A"}
                                                </div>
                                                <div style={{ marginTop: 8, color: '#999' }}>/ 10 điểm</div>
                                            </Col>
                                            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                                                <div style={{ marginBottom: 8, color: '#666' }}>Điểm Tổng kết</div>
                                                <div className="score-circle" style={{ 
                                                    background: user.final_grade >= 5 
                                                        ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' 
                                                        : 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
                                                }}>
                                                    {user.final_grade !== undefined && user.final_grade !== null 
                                                        ? user.final_grade 
                                                        : "N/A"}
                                                </div>
                                                <div style={{ marginTop: 8, color: '#999' }}>/ 10 điểm</div>
                                            </Col>
                                            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                                                <div style={{ marginBottom: 8, color: '#666' }}>Kết quả</div>
                                                {(() => {
                                                    const finalInfo = getFinalStatusInfo(user.final_status);
                                                    return (
                                                        <Tag 
                                                            color={finalInfo.color} 
                                                            style={{ 
                                                                fontSize: 24, 
                                                                padding: '16px 32px',
                                                                borderRadius: 8
                                                            }}
                                                        >
                                                            {finalInfo.icon} {finalInfo.text}
                                                        </Tag>
                                                    );
                                                })()}
                                            </Col>
                                        </Row>

                                        <Divider />

                                        {/* Nhận xét từ Mentor */}
                                        <div>
                                            <h4><StarOutlined /> Nhận xét từ Doanh nghiệp / Mentor</h4>
                                            <div style={{ 
                                                background: '#f6ffed', 
                                                padding: 20, 
                                                borderRadius: 8,
                                                border: '1px solid #b7eb8f',
                                                marginTop: 12
                                            }}>
                                                <p style={{ 
                                                    fontStyle: 'italic', 
                                                    fontSize: 16, 
                                                    color: '#333',
                                                    margin: 0,
                                                    lineHeight: 1.8
                                                }}>
                                                    "{user.mentor_feedback || "Chưa có nhận xét từ người hướng dẫn"}"
                                                </p>
                                                <div style={{ marginTop: 12, textAlign: 'right', color: '#666' }}>
                                                    — {user.mentor_name || "Người hướng dẫn"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ghi chú từ Giáo vụ */}
                                        {user.admin_note && (
                                            <div style={{ marginTop: 24 }}>
                                                <h4><AuditOutlined /> Ghi chú từ Giáo vụ</h4>
                                                <div style={{ 
                                                    background: '#e6f7ff', 
                                                    padding: 16, 
                                                    borderRadius: 8,
                                                    border: '1px solid #91d5ff'
                                                }}>
                                                    <p style={{ margin: 0 }}>{user.admin_note}</p>
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                </Col>

                                {/* Timeline / Lịch sử */}
                                <Col xs={24} lg={8}>
                                    <Card title={<><HistoryOutlined /> Lịch sử thực tập</>}>
                                        <Timeline>
                                            <Timeline.Item color="blue" dot={<FormOutlined />}>
                                                <div className="timeline-item">
                                                    <strong>Đăng ký thực tập</strong>
                                                    <div style={{ color: '#666', fontSize: 12 }}>
                                                        {formatDateTime(user.createdAt)}
                                                    </div>
                                                </div>
                                            </Timeline.Item>
                                            <Timeline.Item color="gold" dot={<CheckOutlined />}>
                                                <div className="timeline-item">
                                                    <strong>Được phê duyệt</strong>
                                                    <div style={{ color: '#666', fontSize: 12 }}>
                                                        Giáo vụ đã duyệt hồ sơ
                                                    </div>
                                                </div>
                                            </Timeline.Item>
                                            <Timeline.Item color="green" dot={<BookOutlined />}>
                                                <div className="timeline-item">
                                                    <strong>Bắt đầu thực tập</strong>
                                                    <div style={{ color: '#666', fontSize: 12 }}>
                                                        {formatDate(user.start_date)}
                                                    </div>
                                                    <div style={{ fontSize: 12 }}>
                                                        Tại: {user.internship_unit || "N/A"}
                                                    </div>
                                                </div>
                                            </Timeline.Item>
                                            <Timeline.Item color="green" dot={<CalendarOutlined />}>
                                                <div className="timeline-item">
                                                    <strong>Kết thúc thực tập</strong>
                                                    <div style={{ color: '#666', fontSize: 12 }}>
                                                        {formatDate(user.end_date)}
                                                    </div>
                                                </div>
                                            </Timeline.Item>
                                            <Timeline.Item color="blue" dot={<TrophyOutlined />}>
                                                <div className="timeline-item">
                                                    <strong>Hoàn thành đánh giá</strong>
                                                    <div style={{ color: '#666', fontSize: 12 }}>
                                                        Điểm: {user.final_grade || "N/A"}/10
                                                    </div>
                                                </div>
                                            </Timeline.Item>
                                        </Timeline>
                                    </Card>
                                </Col>
                            </Row>
                        ) : (
                            /* Chưa hoàn thành - hiển thị thông báo */
                            <Card>
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    {status === "Đang thực tập" ? (
                                        <>
                                            <Progress type="circle" percent={50} status="active" strokeColor="#52c41a" />
                                            <h3 style={{ marginTop: 24, color: '#52c41a' }}>Đang trong quá trình thực tập</h3>
                                            <p style={{ color: '#666' }}>
                                                Kết quả đánh giá sẽ được cập nhật sau khi bạn hoàn thành kỳ thực tập
                                            </p>
                                            <div style={{ marginTop: 24 }}>
                                                <p><strong>Đơn vị:</strong> {user.internship_unit || "N/A"}</p>
                                                <p><strong>Mentor:</strong> {user.mentor_name || "Chưa phân công"}</p>
                                                <p><strong>Thời gian còn lại:</strong> {user.end_date ? `đến ${formatDate(user.end_date)}` : "Chưa xác định"}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <FileTextOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                                            <h3 style={{ marginTop: 24, color: '#999' }}>Chưa có kết quả đánh giá</h3>
                                            <p style={{ color: '#bfbfbf' }}>
                                                Vui lòng hoàn thành kỳ thực tập để xem kết quả đánh giá chi tiết
                                            </p>
                                            {(!status || status === "") && (
                                                <Link to="/profile">
                                                    <Button type="primary" style={{ marginTop: 16 }}>
                                                        Đăng ký thực tập
                                                    </Button>
                                                </Link>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Card>
                        )}
                    </TabPane>
                </Tabs>

                {/* Footer Actions */}
                <Divider />
                <div style={{ textAlign: 'center' }}>
                    <Button 
                        type="default" 
                        icon={<LogoutOutlined />} 
                        onClick={userActions.logout}
                        danger
                    >
                        Đăng xuất
                    </Button>
                </div>

                <Divider />
                <p style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
                    <b>Hệ thống Quản lý Sinh viên Thực tập</b><br/>
                    Student Internship Management System
                </p>
            </div>
        </div>
    );
}
