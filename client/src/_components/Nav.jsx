import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authAtom } from '_state';
import { useUserActions } from '_actions';
import 'antd/dist/antd.css';

import { Layout, Menu, Tag } from 'antd';
import {
    HomeOutlined,
    UserOutlined,
    TableOutlined,
    LoginOutlined,
    TeamOutlined,
    FileTextOutlined,
    FormOutlined,
    DatabaseOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export { Nav };

function Nav(props) {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const onCollapse = (collapsed) => setCollapsed(collapsed);
    const userActions = useUserActions();
    const auth = props.auth;
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");

    useEffect(() => {
        console.log("NAV constructing");
    }, []);

    if (!auth) return null;

    // Lấy role để hiển thị badge
    const getRoleBadge = () => {
        switch (userData?.role) {
            case 'admin':
                return <Tag color="red" style={{ marginLeft: 8 }}>Admin</Tag>;
            case 'student':
                return <Tag color="blue" style={{ marginLeft: 8 }}>SV</Tag>;
            default:
                return null;
        }
    };

    return (
        <Sider 
            style={{
                overflow: 'auto',
                height: '90vh',
                left: 0,
                top: 64,
                position: "sticky"
            }}
            collapsible 
            collapsed={collapsed} 
            onCollapse={onCollapse}
        >
            <div className="logo" />
            <Menu
                theme="dark"
                mode="inline"
                defaultSelectedKeys={[location.pathname]}
                selectedKeys={[location.pathname]}
            >
                {/* Trang chủ - Dashboard */}
                <Menu.Item key="/">
                    <HomeOutlined />
                    <span>Trang chủ</span>
                    <Link to="/"></Link>
                </Menu.Item>

                {/* Menu cho Admin */}
                {userData?.role === "admin" && (
                    <>
                        <Menu.Item key="/admin/students">
                            <TableOutlined />
                            <span>Quản lý SV thực tập</span>
                            <Link to="/admin/students" />
                        </Menu.Item>
                        <Menu.Item key="/dbportal">
                            <DatabaseOutlined />
                            <span>Import dữ liệu</span>
                            <Link to="/dbportal" />
                        </Menu.Item>
                    </>
                )}

                {/* Menu cho Student - Đăng ký thực tập */}
                {userData?.role === "student" && (
                    <Menu.Item key="/internship">
                        <FormOutlined />
                        <span>Đăng ký thực tập</span>
                        <Link to="/internship" />
                    </Menu.Item>
                )}

                {/* Hồ sơ cá nhân - Cho tất cả */}
                <Menu.Item key="/profile">
                    <UserOutlined />
                    <span>Hồ sơ cá nhân</span>
                    <Link to="/profile"></Link>
                </Menu.Item>

                {/* Divider */}
                <Menu.Item key="divider" disabled style={{ cursor: 'default', height: 1, background: '#ffffff20', margin: '8px 0' }}>
                </Menu.Item>

                {/* Đăng xuất */}
                <Menu.Item key="logout" onClick={userActions.logout}>
                    <LoginOutlined />
                    <span>Đăng xuất</span>
                </Menu.Item>
            </Menu>
        </Sider>
    );
}
