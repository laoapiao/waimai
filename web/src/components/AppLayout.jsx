/**
 * 后台管理布局 — 响应式，适配电脑和手机
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Drawer } from 'antd';
import {
  DashboardOutlined, ShopOutlined, OrderedListOutlined,
  StarOutlined, AppstoreOutlined, SettingOutlined, MessageOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, MenuOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(res => {
      if (res.code === 200 && res.data.logo) setShopLogo(res.data.logo);
    }).catch(() => {});
  }, []);

  const [shopLogo, setShopLogo] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getSelectedKey = () => {
    const p = location.pathname;
    if (p === '/' || p === '/dashboard') return '/dashboard';
    if (p.startsWith('/orders')) return '/orders';
    if (p.startsWith('/products')) return '/products';
    if (p.startsWith('/categories')) return '/categories';
    if (p.startsWith('/reviews')) return '/reviews';
    if (p.startsWith('/settings')) return '/settings';
    if (p.startsWith('/feedback')) return '/feedback';
    return '/dashboard';
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/orders', icon: <OrderedListOutlined />, label: '订单管理' },
    { key: '/products', icon: <ShopOutlined />, label: '商品管理' },
    { key: '/categories', icon: <AppstoreOutlined />, label: '分类管理' },
    { key: '/reviews', icon: <StarOutlined />, label: '顾客评价' },
    { key: '/feedback', icon: <MessageOutlined />, label: '顾客反馈' },
    { key: '/settings', icon: <SettingOutlined />, label: '店铺设置' },
  ];

  const userMenu = {
    items: [
      { key: 'user', label: `👤 ${user.nickname}`, disabled: true },
      { type: 'divider' },
      { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true },
    ],
    onClick: ({ key }) => { if (key === 'logout') handleLogout(); },
  };

  const onMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #ff6b35, #ff8c5a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, overflow: 'hidden',
        }}>
          {shopLogo
            ? <img src={shopLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🥬'
          }
        </div>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {user.nickname || '阿飘菜市'}
        </span>
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[getSelectedKey()]}
        items={menuItems} onClick={onMenuClick}
        style={{ background: 'transparent', marginTop: 8, border: 'none', flex: 1 }} />
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 电脑端：固定侧边栏 */}
      {!isMobile && (
        <Sider trigger={null} collapsible collapsed={collapsed} width={220}
          style={{ background: '#001529', boxShadow: '2px 0 8px rgba(0,0,0,0.15)' }}>
          {sidebarContent}
        </Sider>
      )}

      {/* 手机端：抽屉菜单 */}
      {isMobile && (
        <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}
          placement="left" width={240} bodyStyle={{ background: '#001529', padding: 0 }}
          headerStyle={{ display: 'none' }} closable={false}>
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ background: '#f0f2f5' }}>
        <Header style={{
          background: '#fff', padding: isMobile ? '0 12px' : '0 24px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile ? (
              <Button type="text" icon={<MenuOutlined style={{ fontSize: 20 }} />}
                onClick={() => setMobileMenuOpen(true)} />
            ) : (
              <Button type="text"
                icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />}
                onClick={() => setCollapsed(!collapsed)} />
            )}
            {isMobile && <span style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{user.nickname || '阿飘菜市'}</span>}
          </div>

          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ background: '#ff6b35' }} />
              {!isMobile && <span style={{ fontSize: 14, color: '#333' }}>{user.nickname}</span>}
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: isMobile ? 10 : 20, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
