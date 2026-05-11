import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  FileTextOutlined,
  LogoutOutlined,
  CalendarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Content } = Layout;

const menuItems = [
  { key: '/reader', icon: <SearchOutlined />, label: 'Browse Books' },
  { key: '/reader/my-loans', icon: <FileTextOutlined />, label: 'My Loans' },
  { key: '/reader/my-reservations', icon: <CalendarOutlined />, label: 'My Reservations' },
];

export default function ReaderLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const selectedKey =
    menuItems.find(i => i.key !== '/reader' && location.pathname.startsWith(i.key))?.key ??
    '/reader';

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'My Profile',
        onClick: () => navigate('/reader/profile'),
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
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <BookOutlined style={{ fontSize: 20, color: '#fff' }} />
          <Typography.Text style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
            LibraryDB
          </Typography.Text>
        </div>

        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, border: 'none' }}
        />

        <Dropdown menu={userMenu} placement="bottomRight">
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar icon={<UserOutlined />} />
            <Typography.Text style={{ color: '#fff' }}>
              {profile?.first_name} {profile?.last_name}
            </Typography.Text>
          </div>
        </Dropdown>
      </Header>

      <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
