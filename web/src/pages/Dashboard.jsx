/**
 * 仪表盘 — 统计卡片（可点击）+ 柱状图弹窗
 */

import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin, Modal } from 'antd';
import {
  ShoppingCartOutlined, DollarOutlined,
  ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { orderAPI } from '../api';
import { ORDER_STATUS } from '../config';
import dayjs from 'dayjs';

const { Title } = Typography;

// 柱状图颜色
const CHART_COLORS = { pending: '#faad14', accepted: '#1890ff', arrived: '#13c2c2', delivering: '#722ed1', completed: '#52c41a', cancelled: '#ddd' };

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartType, setChartType] = useState('');

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.list({ page_size: 200 });
      setOrders(res.data.list || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  // === 统计数据 ===
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const todayOrders = orders.filter(o => dayjs(o.createdAt).isSame(dayjs(), 'day'));
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + parseFloat(o.total_price), 0);
  const completedCount = orders.filter(o => o.status === 'completed').length;

  const statsCards = [
    { key: 'pending', title: '待接单', value: pendingCount, icon: <ClockCircleOutlined />, color: '#faad14', bg: '#fffbe6' },
    { key: 'today', title: '今日订单', value: todayOrders.length, icon: <ShoppingCartOutlined />, color: '#ff6b35', bg: '#fff2e8' },
    { key: 'revenue', title: '今日营收', value: `¥${todayRevenue.toFixed(2)}`, icon: <DollarOutlined />, color: '#52c41a', bg: '#f6ffed' },
    { key: 'completed', title: '已完成', value: completedCount, icon: <CheckCircleOutlined />, color: '#1890ff', bg: '#e6f7ff' },
  ];

  // === 构建图表数据：今天订单按小时分布 ===
  const todayHours = {};
  for (let h = 6; h <= 22; h++) todayHours[h] = { hour: `${h}:00`, pending: 0, accepted: 0, arrived: 0, delivering: 0, completed: 0, cancelled: 0, revenue: 0 };
  todayOrders.forEach(o => {
    const h = dayjs(o.createdAt).hour();
    if (todayHours[h]) {
      todayHours[h][o.status] = (todayHours[h][o.status] || 0) + 1;
      if (o.status !== 'cancelled') todayHours[h].revenue += parseFloat(o.total_price);
    }
  });
  const chartData = Object.values(todayHours);

  // === 全部订单按状态汇总（饼图数据） ===
  const statusSummary = [
    { name: '待接单', value: pendingCount, color: CHART_COLORS.pending },
    { name: '已接单', value: orders.filter(o => o.status === 'accepted').length, color: CHART_COLORS.accepted },
    { name: '配送中', value: orders.filter(o => o.status === 'delivering').length, color: CHART_COLORS.delivering },
    { name: '已完成', value: completedCount, color: CHART_COLORS.completed },
    { name: '已取消', value: orders.filter(o => o.status === 'cancelled').length, color: CHART_COLORS.cancelled },
  ];

  // 详情弹窗
  const openChart = (key) => {
    setChartType(key);
    setChartOpen(true);
  };

  const columns = [
    { title: '订单号', dataIndex: 'order_no', width: 150 },
    { title: '顾客', dataIndex: ['customer', 'nickname'], width: 100 },
    { title: '金额', dataIndex: 'total_price', width: 90, render: v => <span style={{ color: '#ff6b35', fontWeight: 600 }}>¥{v}</span> },
    { title: '状态', dataIndex: 'status', width: 90, render: s => <Tag color={ORDER_STATUS[s]?.color}>{ORDER_STATUS[s]?.text}</Tag> },
    { title: '时间', dataIndex: 'createdAt', width: 150, render: t => dayjs(t).format('MM-DD HH:mm') },
  ];

  // 弹窗里的列表
  const detailOrders = () => {
    if (chartType === 'pending') return orders.filter(o => o.status === 'pending');
    if (chartType === 'today') return todayOrders;
    if (chartType === 'completed') return orders.filter(o => o.status === 'completed');
    return todayOrders.filter(o => o.status !== 'cancelled');
  };

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statsCards.map((card, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card hoverable onClick={() => openChart(card.key)}
              style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: card.bg, color: card.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: 13, color: '#999' }}>{card.title}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#333' }}>{card.value}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 营收趋势 + 热销商品 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title={<span>📈 近7天营收趋势</span>} style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={(() => {
                const days = [];
                for (let i = 6; i >= 0; i--) {
                  const d = dayjs().subtract(i, 'day');
                  const dayOrders = orders.filter(o => dayjs(o.createdAt).isSame(d, 'day') && o.status !== 'cancelled');
                  days.push({ day: d.format('MM/DD'), revenue: dayOrders.reduce((s, o) => s + parseFloat(o.total_price), 0), orders: dayOrders.length });
                }
                return days;
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="营收(¥)" stroke="#ff6b35" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="订单数" stroke="#1890ff" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={<span>🔥 热销商品 TOP5</span>} style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {(() => {
              const productSales = {};
              orders.forEach(o => o.items?.forEach(i => {
                const name = i.product?.name || '未知';
                productSales[name] = (productSales[name] || 0) + i.quantity;
              }));
              const top5 = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
              if (top5.length === 0) return <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无数据</div>;
              return (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={top5.map(([name, qty]) => ({ name, qty }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="qty" name="销量" fill="#ff6b35" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </Card>
        </Col>
      </Row>

      {/* 最近订单 */}
      <Card title={<Title level={5} style={{ margin: 0 }}>📋 最近订单</Title>}
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table columns={columns} dataSource={orders.slice(0, 10)} rowKey="id" size="small" pagination={false} locale={{ emptyText: '暂无订单' }} />
      </Card>

      {/* 图表弹窗 */}
      <Modal title={statsCards.find(c => c.key === chartType)?.title + ' — 数据详情'} open={chartOpen}
        onCancel={() => setChartOpen(false)} footer={null} width={800} destroyOnHidden>
        {/* 柱状图：今日各时段订单量 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📊 今日订单时段分布</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="已完成" stackId="a" fill={CHART_COLORS.completed} />
              <Bar dataKey="delivering" name="配送中" stackId="a" fill={CHART_COLORS.delivering} />
              <Bar dataKey="arrived" name="已到店" stackId="a" fill={CHART_COLORS.arrived} />
              <Bar dataKey="accepted" name="已接单" stackId="a" fill={CHART_COLORS.accepted} />
              <Bar dataKey="pending" name="待接单" stackId="a" fill={CHART_COLORS.pending} />
              <Bar dataKey="cancelled" name="已取消" stackId="a" fill={CHART_COLORS.cancelled} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 状态分布柱状图 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📈 全部订单状态分布</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusSummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" name="订单数" radius={[6, 6, 0, 0]}>
                {statusSummary.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 详细列表 */}
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📋 订单明细 ({detailOrders().length})</div>
        <Table columns={columns} dataSource={detailOrders().slice(0, 15)} rowKey="id" size="small"
          pagination={false} locale={{ emptyText: '暂无数据' }} scroll={{ y: 300 }} />
      </Modal>
    </Spin>
  );
}
