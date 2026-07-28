/**
 * 意见反馈查看 — 商家看顾客反馈
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, Card, Typography, message } from 'antd';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      }).then(r => r.json());
      if (res.code === 200) setFeedbacks(res.data.list || []);
    } catch (e) { message.error('加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const columns = [
    { title: '顾客', dataIndex: ['user', 'nickname'], width: 100 },
    { title: '反馈内容', dataIndex: 'content' },
    { title: '联系方式', dataIndex: 'contact', width: 140, render: v => v || '-' },
    { title: '时间', dataIndex: 'createdAt', width: 160, render: t => dayjs(t).format('YYYY-MM-DD HH:mm') },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>📝 顾客反馈</Title>
      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table columns={columns} dataSource={feedbacks} rowKey="id" loading={loading}
          size="middle" pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: '暂无反馈' }} />
      </Card>
    </div>
  );
}
