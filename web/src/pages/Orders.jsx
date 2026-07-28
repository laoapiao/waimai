/**
 * 订单管理 — 统计卡片 + 订单列表 + 实时通知
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Select, Button, Modal, Descriptions, Space, message, Typography, Badge, notification, Card, Row, Col } from 'antd';
import { EyeOutlined, BellOutlined, ClockCircleOutlined, CheckCircleOutlined, CarOutlined } from '@ant-design/icons';
import { orderAPI } from '../api';
import { io } from 'socket.io-client';
import { ORDER_STATUS } from '../config';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newOrderCount, setNewOrderCount] = useState(0);

  // WebSocket 实时通知
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = io('http://localhost:3000', { auth: { token }, transports: ['websocket'] });
    socket.on('order:new', (order) => {
      setOrders(prev => [order, ...prev]);
      setNewOrderCount(c => c + 1);
      notification.info({
        message: '🔔 新订单！',
        description: `顾客 ${order.customer?.nickname} 下单 ¥${order.total_price}`,
        placement: 'topRight', duration: 4,
      });
    });
    socket.on('order:status', (o) => {
      setOrders(prev => prev.map(x => x.id === o.id ? { ...x, ...o } : x));
    });
    return () => socket.disconnect();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderAPI.list({ page_size: 100 });
      setOrders(res.data.list || []);
    } catch (e) { message.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      message.success('状态已更新');
      fetchOrders();
    } catch (e) { message.error(e.message); }
  };

  const showDetail = async (order) => {
    try {
      const res = await orderAPI.getById(order.id);
      setSelectedOrder(res.data);
      setDetailOpen(true);
    } catch (e) { message.error(e.message); }
  };

  // 统计数据
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const deliveringCount = orders.filter(o => o.status === 'delivering').length;
  const todayCompleted = orders.filter(o => o.status === 'completed' && dayjs(o.updatedAt).isSame(dayjs(), 'day')).length;
  const todayRevenue = orders
    .filter(o => o.status !== 'cancelled' && dayjs(o.updatedAt).isSame(dayjs(), 'day'))
    .reduce((s, o) => s + parseFloat(o.total_price), 0);

  const statCards = [
    { title: '待接单', value: pendingCount, icon: <ClockCircleOutlined />, color: '#faad14', bg: '#fffbe6' },
    { title: '配送中', value: deliveringCount, icon: <CarOutlined />, color: '#722ed1', bg: '#f9f0ff' },
    { title: '今日完成', value: todayCompleted, icon: <CheckCircleOutlined />, color: '#52c41a', bg: '#f6ffed' },
    { title: '今日营收', value: `¥${todayRevenue.toFixed(2)}`, icon: <BellOutlined />, color: '#ff6b35', bg: '#fff2e8' },
  ];

  const columns = [
    { title: '订单号', dataIndex: 'order_no', width: 150, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: '顾客', dataIndex: ['customer', 'nickname'], width: 90 },
    {
      title: '商品', dataIndex: 'items', width: 220,
      render: items => items?.map(i => `${i.product?.name}×${i.quantity}`).join('、') || '-',
    },
    {
      title: '金额', dataIndex: 'total_price', width: 80,
      render: v => <span style={{ color: '#ff6b35', fontWeight: 700, fontSize: 15 }}>¥{v}</span>,
    },
    {
      title: '骑手', dataIndex: ['rider', 'nickname'], width: 90,
      render: v => v || <Tag style={{ color: '#999' }}>待分配</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 140,
      render: (status, record) => (
        <Space>
          <Tag color={ORDER_STATUS[status]?.color}>{ORDER_STATUS[status]?.text}</Tag>
          {status === 'pending' && (
            <Select size="small" value={status}
              onChange={val => handleStatusChange(record.id, val)}
              style={{ width: 72 }}
              options={[{ value: 'accepted', label: '接单' }, { value: 'cancelled', label: '取消' }]}
            />
          )}
        </Space>
      ),
    },
    {
      title: '时间', dataIndex: 'createdAt', width: 140,
      render: t => dayjs(t).format('MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'action', width: 70,
      render: (_, r) => <Button type="link" icon={<EyeOutlined />} onClick={() => showDetail(r)}>详情</Button>,
    },
  ];

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0 }}>📋 订单管理</Title>
          {newOrderCount > 0 && (
            <Badge count={newOrderCount} overflowCount={99}>
              <BellOutlined style={{ fontSize: 20, color: '#ff6b35' }} />
            </Badge>
          )}
        </div>
        <Space>
          {newOrderCount > 0 && <Button size="small" onClick={() => setNewOrderCount(0)}>清除提醒</Button>}
          <Button onClick={fetchOrders} type="primary" ghost>🔄 刷新</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((card, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card hoverable style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: card.bg, color: card.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: '#999' }}>{card.title}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#333' }}>{card.value}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 订单表格 */}
      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          columns={columns} dataSource={orders} rowKey="id"
          loading={loading} size="middle"
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 个订单`, showSizeChanger: false }}
        />
      </Card>

      {/* 订单详情弹窗 */}
      <Modal title="📄 订单详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        {selectedOrder && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="订单编号">{selectedOrder.order_no}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={ORDER_STATUS[selectedOrder.status]?.color}>{ORDER_STATUS[selectedOrder.status]?.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="顾客">{selectedOrder.customer?.nickname}</Descriptions.Item>
            <Descriptions.Item label="电话">{selectedOrder.contact_phone}</Descriptions.Item>
            <Descriptions.Item label="地址">{selectedOrder.delivery_address}</Descriptions.Item>
            <Descriptions.Item label="备注">{selectedOrder.remark || '无'}</Descriptions.Item>
            <Descriptions.Item label="骑手">{selectedOrder.rider?.nickname || '未分配'}</Descriptions.Item>
            <Descriptions.Item label="金额">
              <span style={{ color: '#ff6b35', fontWeight: 700, fontSize: 16 }}>¥{selectedOrder.total_price}</span>
            </Descriptions.Item>
            <Descriptions.Item label="时间">{dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="商品明细">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx}>{item.product?.name} × {item.quantity}（¥{item.unit_price}/份）</div>
              ))}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
