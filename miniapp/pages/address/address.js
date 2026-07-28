/**
 * 收货地址管理
 */

Page({
  data: {
    addresses: [],
    showModal: false,
    editing: null,
    form: { name: '', phone: '', district: '', detail: '' },
  },

  onShow() {
    this.loadAddresses();
  },

  loadAddresses() {
    const addresses = wx.getStorageSync('addresses') || [];
    this.setData({ addresses });
  },

  saveAddresses(addresses) {
    wx.setStorageSync('addresses', addresses);
    this.loadAddresses();
  },

  // 新增
  addAddress() {
    this.setData({ showModal: true, editing: null, form: { name: '', phone: '', district: '', detail: '' } });
  },

  // 编辑
  editAddress(e) {
    const addr = this.data.addresses.find(a => a.id === e.currentTarget.dataset.id);
    if (addr) {
      this.setData({
        showModal: true, editing: addr.id,
        form: { name: addr.name, phone: addr.phone, district: addr.district, detail: addr.detail },
      });
    }
  },

  // 删除
  deleteAddress(e) {
    wx.showModal({
      title: '删除地址',
      content: '确定删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          const addresses = this.data.addresses.filter(a => a.id !== e.currentTarget.dataset.id);
          this.saveAddresses(addresses);
        }
      },
    });
  },

  // 设默认
  setDefault(e) {
    const addresses = this.data.addresses.map(a => ({
      ...a,
      isDefault: a.id === e.currentTarget.dataset.id,
    }));
    this.saveAddresses(addresses);
  },

  // 表单输入
  onField(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  // 保存
  saveAddress() {
    const { form, editing, addresses } = this.data;
    if (!form.name || !form.phone || !form.district || !form.detail) {
      return wx.showToast({ title: '请填写完整', icon: 'none' });
    }
    if (!/^1\d{10}$/.test(form.phone)) {
      return wx.showToast({ title: '手机号格式不正确', icon: 'none' });
    }

    if (editing) {
      // 编辑
      const idx = addresses.findIndex(a => a.id === editing);
      if (idx > -1) {
        addresses[idx] = { ...addresses[idx], ...form, province: form.district, city: '', detail: form.detail };
      }
    } else {
      // 新增
      addresses.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...form,
        province: form.district, city: '',
        isDefault: addresses.length === 0,
        detail: form.detail,
      });
    }

    this.saveAddresses(addresses);
    this.setData({ showModal: false });
    wx.showToast({ title: '保存成功', icon: 'success' });
  },

  closeModal() {
    this.setData({ showModal: false });
  },
});
