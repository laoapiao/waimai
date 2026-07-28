/**
 * 评价查看页面
 * 商家查看所有顾客的评价
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, Rate, Tag, Typography, message, Card } from 'antd';
import { reviewAPI } from '../api';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewAPI.list({ page_size: 100 });
      setReviews(res.data.list || []);
    } catch (error) {
      message.error(error.message || '获取评价列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const columns = [
    {
      title: '顾客',
      dataIndex: 'user',
      width: 120,
      render: (user) => user?.nickname || '匿名用户',
    },
    {
      title: '订单号',
      dataIndex: 'order',
      width: 160,
      render: (order) => order?.order_no || '-',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 160,
      render: (rating) => <Rate disabled value={rating} />,
    },
    {
      title: '评价内容',
      dataIndex: 'content',
      render: (content) => (
        content
          ? <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>{content}</Paragraph>
          : <Tag>无文字评价</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>⭐ 顾客评价</Title>
      </div>

      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条评价`, showSizeChanger: false }}
          locale={{ emptyText: '暂无评价' }}
        />
      </Card>
    </div>
  );
}
