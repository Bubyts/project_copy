import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  UserOutlined,
  TagsOutlined,
  FileTextOutlined,
  BarChartOutlined,
  LogoutOutlined,
  TeamOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/books', icon: <BookOutlined />, label: 'Books' },
  { key: '/admin/authors', icon: <TeamOutlined />, label: 'Authors' },
  { key: '/admin/categories', icon: <TagsOutlined />, label: 'Categories' },
  { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
  { key: '/admin/loans', icon: <FileTextOutlined />, label: 'Loans' },
  { key: '/admin/reservations', icon: <CalendarOutlined />, label: 'Reservations' },
  { key: '/admin/reports', icon: <BarChartOutlined />, label: 'Reports' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const selectedKey = menuItems
    .map(i => i.key)
    .filter(k => location.pathname === k || (k !== '/admin' && location.pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0] ?? '/admin';

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'My Profile',
        onClick: () => navigate('/admin/profile'),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sign out',
        danger: true,
        onClick: signOut,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        style={{ background: '#001529' }}
      >
        <div style={{ padding: '16px', textAlign: 'center', color: '#fff' }}>
          <BookOutlined style={{ fontSize: 24, marginBottom: collapsed ? 0 : 8 }} />
          {!collapsed && (
            <Typography.Text style={{ color: '#fff', display: 'block', fontSize: 12, fontWeight: 600 }}>
              LibraryDB Admin
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <Typography.Text>{profile?.first_name} {profile?.last_name}</Typography.Text>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, padding: 24, background: '#f5f5f5', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
