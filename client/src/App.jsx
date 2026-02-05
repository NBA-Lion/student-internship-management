import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect, useParams, useHistory } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Layout, Row, Col, Spin, Modal, Button } from 'antd';
import Title from 'antd/lib/typography/Title';

import { Nav, PrivateRoute, ClassPicker } from '_components';
import { Home } from 'home';
import { useAuthWrapper, useClassWrapper } from '_helpers';
import { clearAuth, getUserData } from '_helpers/auth-storage';
import { authAtom, classPickerVisibleAtom, loadingVisibleAtom, sessionExpiredAtom } from '_state';
import { useUserActions } from '_actions';
import { Notification } from './_components/bach_component/Notification/Notification';
import Socket from '_components/bach_component/Socket/socket';
import LinearProgress from '@mui/material/LinearProgress';

// ========== LAZY LOAD - Chỉ tải khi cần, giảm thời gian load trang đầu ==========
const Account = lazy(() => import('_components/account/Account'));
const ResetPasswordPage = lazy(() => import('pages/Auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import('_components/dashboard').then(m => ({ default: m.Dashboard })));
const Feed = lazy(() => import('_components/feed').then(m => ({ default: m.Feed })));
const Chat = lazy(() => import('_components/chat').then(m => ({ default: m.Chat })));
const ChatWidget = lazy(() => import('_components/chat/ChatWidget').then(m => ({ default: m.default })));
const Profile = lazy(() => import('_components/profile').then(m => ({ default: m.Profile })));
const StudentInfoList = lazy(() => import('_components/studentInfoList').then(m => ({ default: m.StudentInfoList })));
const StudentScoreList = lazy(() => import('_components/studentScoreList').then(m => ({ default: m.StudentScoreList })));
const PersonalScore = lazy(() => import('_components/studentScoreList').then(m => ({ default: m.PersonalScore })));
const AdminStudents = lazy(() => import('_components/admin/AdminStudents').then(m => ({ default: m.AdminStudents })));
const AdminDashboard = lazy(() => import('pages/admin/Dashboard').then(m => ({ default: m.default || m.AdminDashboard })));
const DBPortal = lazy(() => import('_components/dbportal/DBPortal').then(m => ({ default: m.default })));
const StuHome = lazy(() => import('home/StuHome').then(m => ({ default: m.StuHome })));
const InternshipTabs = lazy(() => import('_components/internship/InternshipTabs').then(m => ({ default: m.default })));

// ========== FIX ResizeObserver Loop Error (không vi phạm quy tắc import) ==========
// Một số component (Table, Layout) dùng ResizeObserver gây ra warning
// "ResizeObserver loop completed with undelivered notifications." trong dev mode.
// Đoạn dưới chặn lỗi này để không làm hiện overlay đỏ, nhưng KHÔNG ảnh hưởng logic.
if (typeof window !== 'undefined') {
    const swallowResizeObserverError = (event) => {
        const msg = event.message || '';
        if (
            msg.includes('ResizeObserver loop limit exceeded') ||
            msg.includes('ResizeObserver loop completed') ||
            msg.includes('ResizeObserver loop completed with undelivered notifications')
        ) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    };

    // Lắng nghe cả capture lẫn bubble để chặn trước dev overlay của CRA
    window.addEventListener('error', swallowResizeObserverError, true);
    window.addEventListener('error', swallowResizeObserverError);

    // Thêm chặn qua console.error để tránh React error overlay hiển thị
    const originalConsoleError = console.error;
    console.error = (...args) => {
        try {
            const first = args[0];
            if (typeof first === 'string' &&
                (first.includes('ResizeObserver loop limit exceeded') ||
                 first.includes('ResizeObserver loop completed with undelivered notifications') ||
                 first.includes('ResizeObserver loop completed'))) {
                // Nuốt riêng lỗi ResizeObserver
                return;
            }
        } catch (_) {
            // Nếu có lỗi khi parse, fallback gọi error gốc
        }
        originalConsoleError.apply(console, args);
    };

    // Ẩn hẳn React error overlay trong môi trường development
    try {
        if (process.env.NODE_ENV === 'development') {
            const style = document.createElement('style');
            style.innerHTML = `
                /* CRA / webpack dev error overlays */
                #webpack-dev-server-client-overlay,
                #react-error-overlay,
                iframe[data-webpack-dev-server-overlay],
                iframe[src*="webpack-dev-server"] {
                    display: none !important;
                    pointer-events: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
            `;
            document.head.appendChild(style);
        }
    } catch (e) {
        // Nếu có lỗi khi inject CSS thì bỏ qua, không ảnh hưởng app
    }
}

// Fallback khi lazy component đang tải
const PageFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
        <Spin size="large" tip="Đang tải..." />
    </div>
);

// Modal thông báo hết phiên đăng nhập — dùng React Router để giữ layout, không reload trang
function SessionExpiredModal() {
    const history = useHistory();
    const [sessionExpired, setSessionExpired] = useRecoilState(sessionExpiredAtom);
    const goLogin = () => {
        const from = (sessionExpired && sessionExpired.from) ? sessionExpired.from : '';
        clearAuth();
        setSessionExpired(null);
        history.replace('/account/login?expired=1&from=' + from);
    };
    return (
        <Modal
            title="Phiên đăng nhập đã hết hạn"
            open={!!sessionExpired}
            closable={false}
            footer={[
                <Button key="login" type="primary" onClick={goLogin}>
                    Đăng nhập lại
                </Button>
            ]}
        >
            Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
        </Modal>
    );
}

const { Header, Content } = Layout;

export { App };

function App() {
    const authWrapper = useAuthWrapper();
    const classWrapper = useClassWrapper();
    const [drawerVisible, setDrawerVisible] = useRecoilState(classPickerVisibleAtom);
    const [loadingVisible] = useRecoilState(loadingVisibleAtom);

    const userData = getUserData();
    
    const userActions = useUserActions();
    const showDrawer = () => {
        classWrapper.getClassList();
        setDrawerVisible(true);
    };

    const onDrawerClose = () => {
        setDrawerVisible(false);
    };

    return (
        <div className={'app-container' + (authWrapper.tokenValue ? ' bg-light' : '')}>
            <Router>
                {authWrapper.tokenValue && <Socket></Socket>}
                
                <Switch>
                    {/* Reset password - public, no layout (token in URL) */}
                    <Route path="/reset-password/:token" render={(props) => (
                        <Suspense fallback={<PageFallback />}>
                            <ResetPasswordPage {...props} />
                        </Suspense>
                    )} />
                    {/* Auth pages - NO Layout wrapper, full screen */}
                    <Route path="/account" render={(props) => (
                        <Suspense fallback={<PageFallback />}>
                            <Account {...props} />
                        </Suspense>
                    )} />

                    {/* All other pages - WITH Layout wrapper */}
                    <Route>
                        <Layout style={{ minHeight: '100vh' }}>
                            <Header style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%' }}>
                                <Row gutter={0}>
                                    <Col className="gutter-row" flex="1 1 500px">
                                        <div>
                                            <Title style={{ padding: '15px 0 0 0', color: 'white' }} level={3}>Website Quản lý Sinh viên Thực tập</Title>
                                        </div>
                                    </Col>
                                    <Col style={{minWidth:"300px"}} span='auto'>
                                        <div>
                                            <div style={{color: 'white', fontSize: '14px', textAlign: 'right', marginRight:'20px'}}> 
                                                <b>{ClassNameDisplay()}</b>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </Header> 
                            <Layout>
                                <Nav onLogout={userActions.logout} auth={authWrapper.tokenValue} userData={userData} classID={classWrapper.curClass ? (classWrapper.curClass._id || classWrapper.curClass.class_id) : ""}/>
                                
                                <Layout>
                                    <Content style={{ margin: '20px 16px', background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
                                        <Suspense fallback={<PageFallback />}>
                                            <Switch>
                                                <PrivateRoute exact path="/" component={Home} />
                                                <PrivateRoute path="/chat" component={Chat} />
                                                <PrivateRoute path="/profile" component={Profile} />
                                                <PrivateRoute exact path="/dbportal" component={DBPortal} />
                                                <PrivateRoute exact path="/admin/dashboard" component={AdminDashboard} />
                                                <PrivateRoute exact path="/admin/students" component={AdminStudents} />
                                                <PrivateRoute exact path="/internship" component={InternshipTabs} />
                                                <PrivateRoute path="/:classID" component={Child} />
                                                <Redirect from="*" to="/" />
                                            </Switch>
                                        </Suspense>
                                    </Content>
                                </Layout>
                            </Layout> 
                        </Layout>
                    </Route>
                </Switch>
            
                <ClassPicker drawerVisible={drawerVisible} setDrawerVisible={setDrawerVisible} onDrawerClose={onDrawerClose}/>
                <SessionExpiredModal />
                <Notification></Notification>
                <LinearProgress sx={{position:"fixed", width: "100%", top: "0px", zIndex:2, visibility: (loadingVisible ? "visible" : "hidden")}} />
                
                {/* Chat Widget - Lazy load, không chặn trang chính */}
                {authWrapper.tokenValue && (
                    <Suspense fallback={null}>
                        <ChatWidget />
                    </Suspense>
                )}
            </Router>
        </div>
    );
}

function Child() {
    let { classID } = useParams();
    const userData = getUserData();
    const classWrapper = useClassWrapper();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (classID) {
            classWrapper.chooseClassById(classID).then(() => setLoaded(true));
        }
    }, [classID]);

    // Logic lấy ID lớp chuẩn
    const currentClassId = classWrapper.curClass ? (classWrapper.curClass._id || classWrapper.curClass.class_id) : "";

    return (
    (!classWrapper.curClass && loaded) ? <Redirect to="/" /> :
        <>
            {(classWrapper.curClass) &&  
                <>
                    {(userData.role === "teacher") &&
                        <>
                            <Switch>
                                <PrivateRoute exact path="/:classID/" component={Home} />
                                <PrivateRoute exact path="/:classID/dashboard" component={Dashboard} />
                                <PrivateRoute exact path="/:classID/studentinfo" component={StudentInfoList} />
                                <PrivateRoute exact path="/:classID/studentscore" component={StudentScoreList} />
                                <PrivateRoute exact path="/:classID/feed" component={Feed} />
                                <Redirect from="*" to={`/${currentClassId}/dashboard`} />
                            </Switch>
                        </>
                    }
                    {(userData.role === "student") &&
                        <>
                            <Switch>
                                <PrivateRoute exact path="/" component={Home} />
                                <PrivateRoute exact path="/stuhome" component={StuHome} />
                                <PrivateRoute exact path="/:classID/feed" component={Feed} />
                                <PrivateRoute path="/personalscore" component={PersonalScore}/>
                                <Redirect from="*" to={`/${currentClassId}/feed`} />
                            </Switch>
                        </>
                    }
                </>
            }
        </>
    );
}

function ClassNameDisplay(){
    const auth = useRecoilValue(authAtom);
    const userData = getUserData();
    const hasAuth = auth && (userData.full_name || userData.name || userData.role);

    if (hasAuth && userData && (userData.full_name || userData.name || userData.role)) {
        const fullName = userData.full_name || userData.name || "User";
        const role = userData.role === "admin" ? "Giáo vụ"
                   : userData.role === "student" ? "Sinh viên"
                   : "Cán bộ";
        return `Hi, ${fullName} (${role})`;
    }
    if (!auth) {
        try { localStorage.removeItem('currentClass'); } catch (_) {}
    }
    return "";
}