/**
 * 店铺设置 — Logo 上传 + 店铺名称
 */

import { useState, useEffect, useRef } from 'react';
import { Card, Typography, Input, Button, Upload, message, Space, Divider } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function Settings() {
  const [shopName, setShopName] = useState('阿飘菜市');
  const [logo, setLogo] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [fileList, setFileList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings').then(r => r.json());
      if (res.code === 200) {
        setShopName(res.data.shopName || '阿飘菜市');
        setLogo(res.data.logo);
        setAnnouncement(res.data.announcement || '');
        if (res.data.logo) {
          setFileList([{ uid: '-1', name: 'logo.png', status: 'done', url: res.data.logo }]);
        }
      }
    } catch (e) { /* ignore */ }
  };

  const handleUpload = async (file) => {
    setFileList([file]);
    // 预览
    const reader = new FileReader();
    reader.onload = (e) => setLogo(e.target.result);
    reader.readAsDataURL(file);
    return false; // 阻止自动上传
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('shopName', shopName);
      fd.append('announcement', announcement);
      if (fileList.length > 0 && fileList[0].originFileObj) {
        fd.append('logo', fileList[0].originFileObj);
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: fd,
      }).then(r => r.json());
      if (res.code === 200) {
        message.success('保存成功！刷新页面即可看到新 Logo');
        setLogo(res.data.logo);
        setFileList([]);
      } else {
        message.error(res.message);
      }
    } catch (e) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>🏪 店铺设置</Title>

      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', maxWidth: 600 }}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>店铺名称</div>
            <Input value={shopName} onChange={e => setShopName(e.target.value)}
              placeholder="输入店铺名称" maxLength={30} style={{ height: 44, borderRadius: 10 }} />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>📢 店铺公告</div>
            <Input.TextArea value={announcement} onChange={e => setAnnouncement(e.target.value)}
              placeholder="输入公告内容，顾客将在小程序首页看到" rows={3} maxLength={200}
              style={{ borderRadius: 10 }} />
            <div style={{ color: '#999', fontSize: 12, marginTop: 4, textAlign: 'right' }}>{announcement.length}/200</div>
          </div>

          <Divider />

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>店铺 Logo</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 18,
                background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px dashed #ddd', overflow: 'hidden',
              }}>
                {logo ? (
                  <img src={logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 36, color: '#ccc' }}>🛵</span>
                )}
              </div>

              <div>
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  fileList={fileList}
                  beforeUpload={handleUpload}
                  onRemove={() => { setFileList([]); setLogo(null); }}
                >
                  {fileList.length === 0 && (
                    <div><UploadOutlined /><div style={{ marginTop: 8 }}>选择图片</div></div>
                  )}
                </Upload>
                <div style={{ color: '#999', fontSize: 12 }}>推荐正方形图片，如 200×200 PNG</div>
              </div>
            </div>
          </div>

          <Button type="primary" onClick={handleSave} loading={saving}
            style={{ height: 44, borderRadius: 10, fontWeight: 600, padding: '0 40px' }}>
            保存设置
          </Button>
        </Space>
      </Card>
    </div>
  );
}
