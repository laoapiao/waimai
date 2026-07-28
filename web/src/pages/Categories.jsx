/**
 * 分类管理页
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, message, Typography, Card, Tag, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { categoryAPI } from '../api';

// 常用分类图标
const EMOJI_OPTIONS = ['🍔','🍕','🍜','🍰','🥤','🧋','🍗','🍱','🥗','🍲','🔥','⭐','🆕','💎','🎉','☕'];

const { Title } = Typography;

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [iconPick, setIconPick] = useState('🍔');
  const [iconFile, setIconFile] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoryAPI.list();
      setCategories(res.data || []);
    } catch (e) { message.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openModal = (cat = null) => {
    setEditing(cat);
    if (cat) {
      form.setFieldsValue({ name: cat.name, sort_order: cat.sort_order });
      setIconPick(cat.icon || '🍔');
    } else {
      form.resetFields();
      setIconPick('🍔');
    }
    setIconFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      // 构建请求数据
      const isFormData = iconFile && iconFile.originFileObj;
      if (isFormData) {
        const fd = new FormData();
        fd.append('name', values.name);
        fd.append('sort_order', values.sort_order || 0);
        fd.append('icon_image', iconFile.originFileObj);
        if (iconPick) fd.append('icon', iconPick);
        if (editing) {
          await fetch('/api/categories/' + editing.id, { method: 'PUT', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }, body: fd });
        } else {
          await fetch('/api/categories', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }, body: fd });
        }
      } else {
        if (editing) {
          await categoryAPI.update(editing.id, { ...values, icon: iconPick });
        } else {
          await categoryAPI.create({ ...values, icon: iconPick });
        }
      }
      if (editing) {
        message.success('分类已更新');
      } else {
        message.success('分类已添加');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (e) {
      if (e.message) message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await categoryAPI.remove(id);
      message.success('分类已删除');
      fetchCategories();
    } catch (e) { message.error(e.message); }
  };

  const columns = [
    { title: '排序', dataIndex: 'sort_order', width: 80, align: 'center' },
    { title: '分类名称', dataIndex: 'name', width: 200 },
    {
      title: '图标', dataIndex: 'icon', width: 100,
      render: v => v
        ? (v.startsWith('http') ? <img src={v} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>{v}</span>)
        : <span style={{ color: '#ccc' }}>-</span>,
    },
    {
      title: '操作', key: 'action', width: 180,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
          <Popconfirm title="确定删除？如果分类下有商品则无法删除" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>📂 分类管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}
          style={{ borderRadius: 8, height: 38, fontWeight: 600 }}>添加分类</Button>
      </div>

      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table columns={columns} dataSource={categories} rowKey="id"
          loading={loading} size="middle"
          pagination={false} locale={{ emptyText: '暂无分类' }} />
      </Card>

      <Modal title={editing ? '编辑分类' : '添加分类'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={handleSubmit}
        confirmLoading={submitting} destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={{ sort_order: 0 }}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如：主食、饮料" maxLength={20} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序（数字越小越靠前）">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="图标">
            <div style={{ marginBottom: 8 }}>
              {EMOJI_OPTIONS.map(emoji => (
                <Tag key={emoji}
                  style={{ fontSize: 22, cursor: 'pointer', padding: '4px 8px', margin: '2px',
                    border: iconPick === emoji ? '2px solid #ff6b35' : '1px solid #eee',
                    borderRadius: 8, background: iconPick === emoji ? '#fff2e8' : '#fff' }}
                  onClick={() => { setIconPick(emoji); form.setFieldsValue({ icon: emoji }); }}
                >{emoji}</Tag>
              ))}
            </div>
            <Input placeholder="或手动输入图标（如：🍜）" maxLength={10}
              value={iconPick} onChange={e => { setIconPick(e.target.value); form.setFieldsValue({ icon: e.target.value }); }} />
          </Form.Item>
          <Form.Item label="或上传图标图片">
            <Upload listType="picture-card" maxCount={1} fileList={iconFile ? [iconFile] : []}
              beforeUpload={file => { setIconFile({ uid: '-1', name: file.name, originFileObj: file }); return false; }}
              onRemove={() => setIconFile(null)}>
              {!iconFile && <div><UploadOutlined /><div style={{ marginTop: 8 }}>上传</div></div>}
            </Upload>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              推荐 80×80 像素 PNG，上传后优先显示图片
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
