/**
 * 商家面板 — 查看订单、接单/取消
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { orderAPI, onSocketEvent } from '../api';
import OrderCard from '../components/OrderCard';

export default function MerchantScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  useEffect(() => {
    loadUser();
    loadOrders();
    // 监听新订单推送（带震动提醒）
    const unsub = onSocketEvent('order:new', (order) => {
      setOrders(prev => [order, ...prev]);
      Vibration.vibrate(500);
    });
    return unsub;
  }, []);

  const loadUser = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.list({ page_size: 100 });
      setOrders(res.data.list || []);
    } catch (err) {
      Alert.alert('错误', '加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 商家确认接单
  const handleAccept = (order) => {
    Alert.alert('确认接单', `确认接受订单 ${order.order_no}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认接单',
        onPress: async () => {
          try {
            await orderAPI.updateStatus(order.id, 'accepted');
            loadOrders();
          } catch (err) {
            Alert.alert('错误', err.message);
          }
        },
      },
    ]);
  };

  // 商家取消订单
  const handleCancel = (order) => {
    Alert.alert('取消订单', `确定取消订单 ${order.order_no}？`, [
      { text: '不了', style: 'cancel' },
      {
        text: '确定取消',
        style: 'destructive',
        onPress: async () => {
          try {
            await orderAPI.updateStatus(order.id, 'cancelled');
            loadOrders();
          } catch (err) {
            Alert.alert('错误', err.message);
          }
        },
      },
    ]);
  };

  // 退出登录
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    navigation.replace('Login');
  };

  const renderOrder = ({ item }) => (
    <OrderCard
      order={item}
      onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
      actions={
        item.status === 'pending'
          ? [
              { label: '确认接单', color: '#52c41a', onPress: handleAccept },
              { label: '取消', color: '#ff4d4f', onPress: handleCancel },
            ]
          : null
      }
    />
  );

  return (
    <View style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.shopName}>🏪 {user.nickname || '商家'}</Text>
          <Text style={styles.headerSub}>订单管理</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>退出</Text>
        </TouchableOpacity>
      </View>

      {/* 统计条 */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{orders.filter(o => o.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>待接单</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{orders.filter(o => o.status === 'delivering').length}</Text>
          <Text style={styles.statLabel}>配送中</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{orders.filter(o => o.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>已完成</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadOrders} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={{ color: '#999', marginTop: 8 }}>暂无订单</Text>
          </View>
        }
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    backgroundColor: '#fff',
  },
  shopName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  headerSub: { fontSize: 13, color: '#999', marginTop: 2 },
  logout: { color: '#ff4d4f', fontSize: 15 },
  statsBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 16, marginBottom: 8, borderTopWidth: 1, borderColor: '#f0f0f0',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#ff6b35' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 100 },
});
