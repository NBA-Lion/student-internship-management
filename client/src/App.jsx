import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect, useParams } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Layout, Row, Col, Spin } from 'antd';
import Title from 'antd/lib/typography/Title';

import { Nav, PrivateRoute, ClassPicker } from '_components';
import { history, } from '_helpers';
import { Home } from 'home';
import { useAuthWrapper, useClassWrapper } from '_helpers';
import { authAtom, classPickerVisibleAtom, loadingVisibleAtom } from '_state';
import { useUserActions } from '_actions';
import { Notification } from './_components/bach_component/Notification/Notification';
import Socket from '_components/bach_component/Socket/socket';
import LinearProgress from '@mui/material/LinearProgress';

// ========== LAZY LOAD - Chỉ tải khi cần, giảm thời gian load trang đầu ==========
const Account = lazy(() => import('_components/account/Account'));
const Dashboard = lazy(() => import('_components/dashboard').then(m => ({ default: m.Dashboard })));
const Feed = lazy(() => import('_components/feed').then(m => ({ default: m.Feed })));
const Chat = lazy(() => import('_components/chat').then(m => ({ default: m.Chat })));
const ChatWidget = lazy(() => import('_components/chat/ChatWidget').then(m => ({ default: m.default })));
const Profile = lazy(() => import('_components/profile').then(m => ({ default: m.Profile })));
const StudentInfoList = lazy(() => import('_components/studentInfoList').then(m => ({ default: m.StudentInfoList })));
const StudentScoreList = lazy(() => import('_components/studentScoreList').then(m => ({ default: m.StudentScoreList })));
const PersonalScore = lazy(() => import('_components/studentScoreList').then(m => ({ default: m.PersonalScore })));
const AdminStudents = lazy(() => import('_components/admin/AdminStudents').then(m => ({ default: m.AdminStudents })));
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

const style = { };
const { Header, Content } = Layout;

export { App };

function App() {
    const authWrapper = useAuthWrapper();
    const classWrapper = useClassWrapper();
    const [drawerVisible, setDrawerVisible] = useRecoilState(classPickerVisibleAtom);
    const [loadingVisible] = useRecoilState(loadingVisibleAtom);

    // Lấy thông tin user an toàn hơn
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    
    const userActions = useUserActions();
    const showDrawer = () => {
        classWrapper.getClassList();
        setDrawerVisible(true);
    };

    const onDrawerClose = () => {
        setDrawerVisible(false);
    };

    // Check if current path is auth page
    const isAuthPage = window.location.pathname.startsWith('/account');

    return (
        <div className={'app-container' + (authWrapper.tokenValue ? ' bg-light' : '')}>
            <Router history={history}>
                {authWrapper.tokenValue && <Socket></Socket>}
                
                <Switch>
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
                                        <div style={style}>
                                            <Title style={{ padding: '15px 0px 0px 0px', color: 'white' }} level={3}> Website Quản lý Sinh viên Thực tập </Title>
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
                                    <Content style={{ margin: '20px 16px' }}>
                                        <Suspense fallback={<PageFallback />}>
                                            <Switch>
                                                <PrivateRoute exact path="/" component={Home} />
                                                <PrivateRoute path="/chat" component={Chat} />
                                                <PrivateRoute path="/profile" component={Profile} />
                                                <PrivateRoute exact path="/dbportal" component={DBPortal} />
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
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const classWrapper = useClassWrapper();
    const [loaded, setloaded] = useState(false);

    useEffect(() => {
        if (classID) {
            classWrapper.chooseClassById(classID).then(() => {
                setloaded(true)
            });
            console.log("Child component construct, classID: ", classID)
        }
    }, [classID]); // Thêm dependency classID

    // Logic lấy ID lớp chuẩn
    const currentClassId = classWrapper.curClass ? (classWrapper.curClass._id || classWrapper.curClass.class_id) : "";

    return (
    (!classWrapper.curClass && loaded) ? <Redirect from="*" to="/" /> :
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
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    
    if (auth && userData) {
        const fullName = userData.full_name || userData.name || "User";
        const role = userData.role === "admin" ? "Giáo vụ" 
                   : userData.role === "student" ? "Sinh viên" 
                   : "Cán bộ";
        
        // Format: "Hi, [Tên] ([Vai trò])"
        return `Hi, ${fullName} (${role})`;
    }    
    localStorage.removeItem('currentClass');
    return "";
}