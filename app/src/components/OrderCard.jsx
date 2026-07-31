/**
 * 订单卡片组件 — 商家和骑手共用
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ORDER_STATUS } from '../config';

export default function OrderCard({ order, onPress, actions }) {
  const statusInfo = ORDER_STATUS[order.status] || { label: order.status, color: '#999' };

  // 商品列表文字
  const productNames = order.items
    ?.map(i => `${i.product?.name || '未知'} ×${i.quantity}`)
    .join('、') || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.orderNo}>{order.order_no}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* 商品 */}
      <Text style={styles.products} numberOfLines={2}>
        {productNames}
      </Text>

      {/* 底部信息 */}
      <View style={styles.footer}>
        <View style={styles.info}>
          {order.store_address ? (
            <Text style={styles.storeAddr} numberOfLines={1}>🏪 {order.store_address}</Text>
          ) : null}
          <Text style={styles.address} numberOfLines={1}>
            📍 {order.delivery_address}
          </Text>
          <Text style={styles.customer}>
            👤 {order.customer?.nickname || '未知'} | 📞 {order.contact_phone}
          </Text>
        </View>
        <Text style={styles.price}>¥{order.total_price}</Text>
      </View>

      {/* 操作按钮 */}
      {actions && actions.length > 0 && (
        <View style={styles.actionRow}>
          {actions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.actionBtn,
                { backgroundColor: action.color || '#ff6b35' },
              ]}
              onPress={() => action.onPress(order)}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  orderNo: { fontSize: 13, color: '#999' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  products: { fontSize: 15, color: '#333', marginBottom: 10, lineHeight: 22 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  info: { flex: 1, marginRight: 12 },
  storeAddr: { fontSize: 13, color: '#1890ff', marginBottom: 2 },
  address: { fontSize: 13, color: '#666', marginBottom: 4 },
  customer: { fontSize: 12, color: '#999' },
  price: { fontSize: 22, fontWeight: 'bold', color: '#ff6b35' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  actionBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
