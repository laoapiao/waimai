/**
 * 商家登录 — 左右分屏设计
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authAPI } from '../api';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [shopLogo, setShopLogo] = useState(null);
  const navigate = useNavigate();

  // 加载店铺设置
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(res => {
      if (res.code === 200 && res.data.logo) setShopLogo(res.data.logo);
    }).catch(() => {});
  }, []);

  // 监听窗口大小
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const token = localStorage.getItem('token');
  if (token) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await authAPI.login(values.phone, values.password);
      if (result.data.user.role !== 'merchant') {
        message.error('该账号不是商家账号，请使用商家账号登录');
        return;
      }
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      message.success('欢迎回来！');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 左侧品牌区 */}
      <div style={{
        flex: 1, background: 'linear-gradient(135deg, #ff6b35 0%, #e05520 100%)',
        display: isMobile ? 'none' : 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: 48, color: '#fff',
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 28,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52, marginBottom: 32, overflow: 'hidden',
        }}>
          {shopLogo
            ? <img src={shopLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🛵'
          }
        </div>
        <Title level={1} style={{ color: '#fff', margin: 0 }}>阿飘菜市 · 商家后台</Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 12 }}>
          高效管理订单 · 商品 · 评价
        </Text>
        <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
          {[
            { num: '实时', label: '订单通知' },
            { num: '📦', label: '商品管理' },
            { num: '⭐', label: '评价查看' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{item.num}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧登录区 */}
      <div style={{
        flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: '#fff', padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 40 }}>
            <Title level={2} style={{ margin: 0 }}>🔐 商家登录</Title>
            <Text type="secondary">请输入商家账号登录后台</Text>
          </div>

          <Form
            onFinish={handleLogin}
            size="large"
            initialValues={{}}
          >
            <Form.Item
              name="phone"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bbb' }} />}
                placeholder="手机号"
                maxLength={11}
                style={{ height: 48, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bbb' }} />}
                placeholder="密码"
                style={{ height: 48, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48, borderRadius: 10, fontSize: 16, fontWeight: 600,
                  background: 'linear-gradient(135deg, #ff6b35, #e05520)',
                  border: 'none',
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          {process.env.NODE_ENV === 'development' && (
          <div style={{ textAlign: 'center', padding: 16, background: '#fafafa', borderRadius: 10 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>💡 测试账号：13800000001 / 123456</Text>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
