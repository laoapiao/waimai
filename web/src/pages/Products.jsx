/**
 * 商品管理页面
 * 功能：查看、添加、编辑、下架、删除商品，上传商品图片
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Upload,
  Space, Tag, Popconfirm, message, Typography, Card,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
} from '@ant-design/icons';
import { productAPI, categoryAPI } from '../api';

const { Title } = Typography;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();

  // 获取商品列表
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productAPI.list({ page_size: 100 });
      setProducts(res.data.list || []);
    } catch (error) {
      message.error(error.message || '获取商品列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取分类列表
  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryAPI.list();
      setCategories(res.data || []);
    } catch (error) {
      // 分类加载失败不阻塞
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // 打开添加/编辑弹窗
  const openModal = (product = null) => {
    setEditingProduct(product);
    setFileList([]);
    if (product) {
      form.setFieldsValue({
        name: product.name,
        price: parseFloat(product.price),
        category_id: product.category_id,
        description: product.description || '',
        is_available: product.is_available,
      });
      // 如果有图片，显示预览
      if (product.image) {
        setFileList([{
          uid: '-1',
          name: '当前图片',
          status: 'done',
          url: product.image,
        }]);
      }
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // 构建 FormData（因为要上传图片）
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('price', values.price);
      formData.append('category_id', values.category_id);
      formData.append('description', values.description || '');
      formData.append('is_available', values.is_available);

      // 判断是否有新图片上传
      const hasNewImage = fileList.length > 0 && fileList[0].originFileObj;
      // 判断是否手动删除了旧图片
      const removedImage = editingProduct && editingProduct.image && fileList.length === 0;

      if (hasNewImage) {
        formData.append('image', fileList[0].originFileObj);
      }
      if (removedImage) {
        formData.append('clear_image', 'true');
      }

      if (editingProduct) {
        // 有新图片或删图片时用 FormData，否则用 JSON（防止 multer 清掉旧图片）
        if (hasNewImage || removedImage) {
          await productAPI.update(editingProduct.id, formData);
        } else {
          await productAPI.update(editingProduct.id, {
            name: values.name,
            price: values.price,
            category_id: values.category_id,
            description: values.description || '',
            is_available: values.is_available,
          });
        }
        message.success('商品修改成功');
      } else {
        await productAPI.create(formData);
        message.success('商品添加成功');
      }

      setModalOpen(false);
      fetchProducts();
    } catch (error) {
      if (error.message) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 删除商品
  const handleDelete = async (id) => {
    try {
      await productAPI.remove(id);
      message.success('商品已删除');
      fetchProducts();
    } catch (error) {
      message.error(error.message || '删除失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '图片',
      dataIndex: 'image',
      width: 80,
      render: (image) => (
        image
          ? <img src={image} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
          : <div style={{ width: 48, height: 48, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>无图</div>
      ),
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (cat) => cat?.name || '-',
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 100,
      render: (price) => <span style={{ color: '#f5222d', fontWeight: 'bold' }}>¥{price}</span>,
    },
    {
      title: '销量',
      dataIndex: 'sales_count',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_available',
      width: 80,
      render: (val) => val
        ? <Tag color="green">上架中</Tag>
        : <Tag color="default">已下架</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个商品吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>📦 商品管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}
          style={{ borderRadius: 8, height: 38, fontWeight: 600 }}>
          添加商品
        </Button>
      </div>

      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 个商品`, showSizeChanger: false }}
        />
      </Card>

      {/* 添加/编辑商品弹窗 */}
      <Modal
        title={editingProduct ? '编辑商品' : '添加商品'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnHidden
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_available: true, price: 10 }}
        >
          <Form.Item
            name="name"
            label="商品名称"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="如：黄焖鸡米饭" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="所属分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="price"
            label="价格（元）"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber
              min={0.01}
              max={99999}
              precision={2}
              prefix="¥"
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item name="description" label="商品描述">
            <Input.TextArea rows={3} placeholder="描述一下这个商品（选填）" maxLength={500} />
          </Form.Item>

          <Form.Item name="is_available" label="上架状态">
            <Select>
              <Select.Option value={true}>上架</Select.Option>
              <Select.Option value={false}>下架</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="商品图片">
            <Upload
              listType="picture-card"
              fileList={fileList}
              maxCount={1}
              beforeUpload={(file) => {
                // 检查文件类型
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('只能上传图片文件！');
                  return Upload.LIST_IGNORE;
                }
                // 检查文件大小（5MB）
                const isLt5M = file.size / 1024 / 1024 < 5;
                if (!isLt5M) {
                  message.error('图片不能超过 5MB！');
                  return Upload.LIST_IGNORE;
                }
                return false; // 不自动上传，由表单统一提交
              }}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            >
              {fileList.length < 1 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
