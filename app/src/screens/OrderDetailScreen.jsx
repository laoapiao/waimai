/**
 * 订单详情页 — 商家和骑手共用
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform } from 'react-native';
import { orderAPI } from '../api';
import { ORDER_STATUS } from '../config';

export default function OrderDetailScreen({ route }) {
  const { id } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const res = await orderAPI.detail(id);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 打开手机地图导航
  const handleNavigate = () => {
    if (!order?.lat || !order?.lng) return;
    const { lat, lng, delivery_address } = order;
    const label = encodeURIComponent(delivery_address || '顾客地址');
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });
    Linking.openURL(url).catch(() => {
      // 如果原生地图打不开，用网页版
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text>订单不存在</Text>
      </View>
    );
  }

  const statusInfo = ORDER_STATUS[order.status] || { label: order.status, color: '#999' };

  return (
    <ScrollView style={styles.container}>
      {/* 状态 */}
      <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
        <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
        <Text style={styles.orderNo}>订单号：{order.order_no}</Text>
      </View>

      {/* 取餐地址 */}
      {order.store_address ? (
        <TouchableOpacity style={styles.storeCard} onPress={() => {
          if (order.store_lat && order.store_lng) {
            const url = Platform.OS === 'ios'
              ? `maps://app?daddr=${order.store_lat},${order.store_lng}&q=${encodeURIComponent(order.store_address)}`
              : `geo:${order.store_lat},${order.store_lng}`;
            Linking.openURL(url).catch(() => {});
          }
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>🏪 取餐地址</Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{order.store_address}</Text>
          {order.store_lat && order.store_lng ? (
            <Text style={{ fontSize: 13, color: '#52c41a', marginTop: 4 }}>🧭 点击导航到店铺</Text>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {/* 顾客位置地图 */}
      {order.lat && order.lng ? (
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>🗺️ 顾客位置</Text>
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.lng - 0.005},${order.lat - 0.005},${order.lng + 0.005},${order.lat + 0.005}&layer=mapnik&marker=${order.lat},${order.lng}`}
                style={{ width: '100%', height: 250, border: 'none', borderRadius: 12 }}
                title="顾客位置"
              />
            ) : (
              <View style={{ height: 250, backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 40 }}>📍</Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                  纬度: {parseFloat(order.lat).toFixed(6)}{'\n'}
                  经度: {parseFloat(order.lng).toFixed(6)}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.openMapBtn} onPress={handleNavigate}>
            <Text style={styles.openMapBtnText}>🧭 打开导航</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 收货信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 收货信息</Text>
        <InfoRow label="顾客" value={order.customer?.nickname} />
        <InfoRow label="电话" value={order.contact_phone} />
        <InfoRow label="地址" value={order.delivery_address} />
        {order.remark ? <InfoRow label="备注" value={order.remark} /> : null}
        <InfoRow label="骑手" value={order.rider?.nickname || '等待接单'} />
      </View>

      {/* 一键导航 */}
      {order.lat && order.lng ? (
        <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
          <Text style={styles.navBtnText}>🗺️ 导航到顾客地址</Text>
          <Text style={styles.navBtnSub}>{order.delivery_address}</Text>
        </TouchableOpacity>
      ) : null}

      {/* 商品明细 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛒 商品明细</Text>
        {order.items?.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.product?.name}</Text>
            <Text style={styles.itemQty}>
              ¥{item.unit_price} × {item.quantity}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>合计</Text>
          <Text style={styles.totalPrice}>¥{order.total_price}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusCard: {
    backgroundColor: '#fff', margin: 16, padding: 20,
    borderRadius: 12, borderLeftWidth: 4,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusLabel: { fontSize: 18, fontWeight: 'bold' },
  orderNo: { fontSize: 13, color: '#999' },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 0, padding: 20, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  infoRow: {
    flexDirection: 'row', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  infoLabel: { width: 60, fontSize: 14, color: '#999' },
  infoValue: { flex: 1, fontSize: 14, color: '#333' },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  itemName: { fontSize: 14, color: '#333', flex: 1 },
  itemQty: { fontSize: 14, color: '#666' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  totalLabel: { fontSize: 16, color: '#333' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: '#ff6b35' },
  // 取餐地址
  storeCard: { backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#1890ff' },
  // 导航按钮
  navBtn: {
    backgroundColor: '#fff', margin: 16, marginTop: 0, padding: 20,
    borderRadius: 12, alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: '#52c41a',
  },
  navBtnText: { fontSize: 18, fontWeight: '700', color: '#52c41a' },
  navBtnSub: { fontSize: 13, color: '#999', marginTop: 6, textAlign: 'center' },
  // 地图
  mapSection: { backgroundColor: '#fff', margin: 16, marginTop: 0, marginBottom: 16, padding: 16, borderRadius: 12 },
  mapContainer: { borderRadius: 12, overflow: 'hidden', marginTop: 10, marginBottom: 10 },
  openMapBtn: { backgroundColor: '#52c41a', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  openMapBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
