/**
 * 骑手面板 — 在线开关 + 今日统计 + 订单池 + 配送中 + 我的
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Switch,
  StyleSheet, Alert, RefreshControl, Vibration,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { orderAPI, onSocketEvent, emitSocketEvent, authAPI } from '../api';
import { ORDER_STATUS } from '../config';
import OrderCard from '../components/OrderCard';

export default function RiderScreen({ navigation }) {
  const [subTab, setSubTab] = useState('orders'); // 'orders' | 'mine'
  const [orderTab, setOrderTab] = useState('available');  // 'available' | 'active'
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});
  const [isOnline, setIsOnline] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState('0.00');
  const [todayCount, setTodayCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [routeMode, setRouteMode] = useState('time'); // 'time' | 'distance'
  const [riderLoc, setRiderLoc] = useState(null); // 骑手当前位置
  const locationTimer = useRef(null);
  const deliveringRef = useRef([]);

  // ====== 初始化 ======
  useEffect(() => {
    loadUser();
    requestLocationPermission();
    const unsub = onSocketEvent('order:new', (order) => {
      setAvailableOrders(prev => [order, ...prev]);
      Vibration.vibrate(500);
    });
    return () => { unsub(); if (locationTimer.current) clearInterval(locationTimer.current); };
  }, []);

  useEffect(() => { if (user.id) { loadOrders(); loadStats(); } }, [user.id, isOnline]);

  // ====== 数据加载 ======
  const loadUser = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      setIsOnline(u.is_online || false);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      await AsyncStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      setIsOnline(res.data.is_online || false);
    } catch (e) { /* ignore */ }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.list({ page_size: 100 });
      const all = res.data.list || [];
      setAvailableOrders(all.filter(o => o.status === 'pending'));
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const uid = userData.id;
      const mine = all.filter(o =>
        o.rider_id === uid && ['accepted', 'arrived', 'delivering'].includes(o.status)
      );
      setActiveOrders(mine);
      setActiveCount(mine.length);
      setCompletedOrders(all.filter(o => o.rider_id === uid && ['completed', 'cancelled'].includes(o.status)));
      startLocationUpdates(mine);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://8.134.213.206/api/auth/rider/stats', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(r => r.json());
      if (res.code === 200) {
        setTodayCount(res.data.todayCount);
        setTodayEarnings(res.data.todayEarnings);
        setActiveCount(res.data.activeCount);
      }
    } catch (e) { /* ignore */ }
  };

  // ====== 上下线 ======
  const toggleOnline = async (val) => {
    try {
      await authAPI.updateProfile({ is_online: val });
      setIsOnline(val);
      await refreshUser();
    } catch (e) {
      Alert.alert('错误', e.message || '操作失败');
      setIsOnline(!val);
    }
  };

  // ====== 距离计算（Haversine公式） ======
  const haversineDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getSortedActiveOrders = () => {
    if (routeMode === 'distance' && riderLoc) {
      return [...activeOrders].sort((a, b) =>
        haversineDistance(riderLoc.lat, riderLoc.lng, parseFloat(a.lat || 0), parseFloat(a.lng || 0))
        - haversineDistance(riderLoc.lat, riderLoc.lng, parseFloat(b.lat || 0), parseFloat(b.lng || 0))
      );
    }
    return [...activeOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  };

  const toggleRouteMode = () => {
    const newMode = routeMode === 'time' ? 'distance' : 'time';
    setRouteMode(newMode);
  };

  // ====== 操作 ======
  const handleAccept = (order) => {
    if (activeCount >= (user.max_orders || 1)) {
      return Alert.alert('接单上限', `当前最多同时接 ${user.max_orders} 单。缴纳保证金后可提升上限。`);
    }
    Alert.alert('确认接单', `${order.order_no}\n${order.delivery_address}`, [
      { text: '取消', style: 'cancel' },
      { text: '我要接单', onPress: async () => {
        try { await orderAPI.accept(order.id); loadOrders(); loadStats(); }
        catch (err) { Alert.alert('接单失败', err.message); }
      }},
    ]);
  };

  const handleArrived = (order) => {
    Alert.alert('确认到店', '已到达取餐点？', [
      { text: '取消', style: 'cancel' },
      { text: '确认到店', onPress: async () => {
        try { await orderAPI.updateStatus(order.id, 'arrived'); loadOrders(); }
        catch (err) { Alert.alert('错误', err.message); }
      }},
    ]);
  };

  const handleDelivering = (order) => {
    Alert.alert('开始配送', '确认已取餐并开始配送？', [
      { text: '取消', style: 'cancel' },
      { text: '开始配送', onPress: async () => {
        try {
          await orderAPI.updateStatus(order.id, 'delivering');
          emitSocketEvent('rider:join_order', { orderId: order.id });
          loadOrders();
        } catch (err) { Alert.alert('错误', err.message); }
      }},
    ]);
  };

  const handleComplete = (order) => {
    Alert.alert('完成配送', '确认已送达？', [
      { text: '取消', style: 'cancel' },
      { text: '确认完成', onPress: async () => {
        try { await orderAPI.updateStatus(order.id, 'completed'); loadOrders(); loadStats(); }
        catch (err) { Alert.alert('错误', err.message); }
      }},
    ]);
  };

  // ====== 定位 ======
  const requestLocationPermission = async () => {
    try { await Location.requestForegroundPermissionsAsync(); } catch (e) { /* ignore */ }
  };

  const startLocationUpdates = (orders) => {
    const deliveringOrders = orders.filter(o => o.status === 'delivering');
    deliveringRef.current = deliveringOrders;
    if (deliveringOrders.length > 0 && !locationTimer.current) {
      locationTimer.current = setInterval(async () => {
        const current = deliveringRef.current;
        if (current.length === 0) { clearInterval(locationTimer.current); locationTimer.current = null; return; }
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude } = loc.coords;
          setRiderLoc({ lat: latitude, lng: longitude });
          for (const order of current) {
            emitSocketEvent('rider:location', { lat: latitude, lng: longitude, orderId: order.id });
          }
        } catch (e) { /* ignore */ }
      }, 8000);
    } else if (deliveringOrders.length === 0 && locationTimer.current) {
      clearInterval(locationTimer.current);
      locationTimer.current = null;
    }
  };

  // ====== 退出 ======
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    navigation.replace('Login');
  };

  // ====== 渲染订单 ======
  const renderOrder = ({ item }) => (
    <OrderCard order={item}
      onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
      actions={
        orderTab === 'available'
          ? [{ label: '我要接单', color: '#ff6b35', onPress: handleAccept }]
          : item.status === 'accepted'
            ? [{ label: '确认到店', color: '#13c2c2', onPress: handleArrived }]
            : item.status === 'arrived'
              ? [{ label: '开始配送', color: '#722ed1', onPress: handleDelivering }]
              : item.status === 'delivering'
                ? [{ label: '完成配送', color: '#52c41a', onPress: handleComplete }]
                : null
      }
    />
  );

  const data = orderTab === 'available' ? availableOrders
    : orderTab === 'completed' ? completedOrders
    : getSortedActiveOrders();

  // ====== 主界面 ======
  return (
    <View style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🛵 {user.nickname || '骑手'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#52c41a' : '#999' }]} />
            <Text style={styles.subtitle}>{isOnline ? '在线接单中' : '已下线'}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', marginRight: 12 }}>
          <Switch value={isOnline} onValueChange={toggleOnline}
            trackColor={{ false: '#ddd', true: '#ff6b35' }} thumbColor="#fff" />
          <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{isOnline ? '下线' : '上线'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>退出</Text>
        </TouchableOpacity>
      </View>

      {/* 今日统计 */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{todayCount}</Text>
          <Text style={styles.statLabel}>今日完成</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#ff6b35' }]}>¥{todayEarnings}</Text>
          <Text style={styles.statLabel}>今日收入</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{activeCount}/{user.max_orders || 1}</Text>
          <Text style={styles.statLabel}>当前/上限</Text>
        </View>
        <TouchableOpacity style={styles.statItem} onPress={() => setSubTab('mine')}>
          <Text style={{ fontSize: 22 }}>👤</Text>
          <Text style={styles.statLabel}>我的</Text>
        </TouchableOpacity>
      </View>

      {/* 订单区 Tab */}
      {subTab === 'orders' && (
        <>
          <View style={styles.tabBar}>
            <TouchableOpacity style={[styles.tab, orderTab === 'available' && styles.tabActive]}
              onPress={() => setOrderTab('available')}>
              <Text style={[styles.tabText, orderTab === 'available' && styles.tabTextActive]}>
                可接订单 ({availableOrders.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, orderTab === 'active' && styles.tabActive]}
              onPress={() => setOrderTab('active')}>
              <Text style={[styles.tabText, orderTab === 'active' && styles.tabTextActive]}>
                配送中 ({activeOrders.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, orderTab === 'completed' && styles.tabActive]}
              onPress={() => setOrderTab('completed')}>
              <Text style={[styles.tabText, orderTab === 'completed' && styles.tabTextActive]}>
                已完成 ({completedOrders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* 路线规划按钮 —— 仅配送中tab显示 */}
          {orderTab === 'active' && activeOrders.length > 1 && (
            <TouchableOpacity style={styles.routeBtn} onPress={toggleRouteMode}>
              <Text style={styles.routeBtnText}>
                {routeMode === 'time' ? '🕐 按接单时间排序' : '📍 按最近距离排序'}
              </Text>
              <Text style={styles.routeBtnHint}>点击切换排序方式</Text>
            </TouchableOpacity>
          )}

          {!isOnline && orderTab === 'available' ? (
            <View style={styles.offlineHint}>
              <Text style={{ fontSize: 60 }}>😴</Text>
              <Text style={{ color: '#999', marginTop: 12, fontSize: 16 }}>已下线，打开开关开始接单</Text>
            </View>
          ) : (
            <FlatList data={data} renderItem={renderOrder} keyExtractor={item => String(item.id)}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={{ fontSize: 48 }}>🛵</Text>
                  <Text style={{ color: '#999', marginTop: 8 }}>
                    {orderTab === 'available' ? '暂无可接订单' : '暂无配送中的订单'}
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
            />
          )}
        </>
      )}

      {/* 我的页面 */}
      {subTab === 'mine' && (
        <MinePanel user={user} refreshUser={refreshUser} onBack={() => setSubTab('orders')} />
      )}
    </View>
  );
}

// ====== 我的面板 ======
function MinePanel({ user, refreshUser, onBack }) {
  const deposit = parseFloat(user.deposit) || 0;
  const maxOrders = user.max_orders || 1;
  const [sliderVal, setSliderVal] = useState(maxOrders);

  const handleDeposit = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://8.134.213.206/api/auth/deposit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ amount: 200 }),
      }).then(r => r.json());
      if (res.code === 200) {
        Alert.alert('缴纳成功', `当前保证金：¥${res.data.deposit}`);
        refreshUser();
      } else {
        Alert.alert('失败', res.message);
      }
    } catch (e) { Alert.alert('错误', '网络错误'); }
  };

  const handleMaxOrders = async (val) => {
    if (val > 1 && deposit < 200) {
      return Alert.alert('提示', `当前保证金 ¥${deposit}，需要 ¥200 才能多单配送。`);
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://8.134.213.206/api/auth/me', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ max_orders: val }),
      }).then(r => r.json());
      if (res.code === 200) {
        refreshUser();
        Alert.alert('已更新', `最大接单数：${val}`);
      } else {
        Alert.alert('失败', res.message);
      }
    } catch (e) { Alert.alert('错误', '网络错误'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* 返回 */}
      <TouchableOpacity onPress={onBack} style={{ padding: 16 }}>
        <Text style={{ color: '#ff6b35', fontSize: 16 }}>← 返回</Text>
      </TouchableOpacity>

      {/* 保证金 */}
      <View style={ms.section}>
        <Text style={ms.sectionTitle}>💰 保证金</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: deposit >= 200 ? '#52c41a' : '#ff4d4f' }}>
              ¥{deposit.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
              {deposit >= 200 ? '✅ 已达标，可多单配送' : '⚠️ 缴纳 ¥200 解锁多单配送'}
            </Text>
          </View>
          <TouchableOpacity style={[ms.btn, { backgroundColor: deposit >= 200 ? '#f5f5f5' : '#ff6b35' }]}
            onPress={handleDeposit}>
            <Text style={{ color: deposit >= 200 ? '#999' : '#fff', fontWeight: '600' }}>
              {deposit >= 200 ? '已缴纳' : '缴纳 ¥200'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 接单上限 */}
      <View style={ms.section}>
        <Text style={ms.sectionTitle}>📦 最大同时接单数</Text>
        <Text style={{ fontSize: 48, fontWeight: '800', color: '#ff6b35', textAlign: 'center', marginVertical: 8 }}>
          {sliderVal}
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={1}
          maximumValue={deposit >= 200 ? 20 : 1}
          step={1}
          value={sliderVal}
          onValueChange={setSliderVal}
          onSlidingComplete={handleMaxOrders}
          minimumTrackTintColor="#ff6b35"
          maximumTrackTintColor="#e8e8e8"
          thumbTintColor="#ff6b35"
          disabled={deposit < 200}
        />
        <Text style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 4 }}>
          {deposit >= 200 ? '1 ~ 20 单 ｜ 已缴保证金 ✅' : '🔒 缴纳后解锁 1~20 单'}
        </Text>
      </View>
    </View>
  );
}

// ====== 样式 ======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 13, color: '#666' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  logout: { color: '#ff4d4f', fontSize: 15 },
  statsBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, borderTopWidth: 1, borderColor: '#f0f0f0' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#333' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 3 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#ff6b35' },
  tabText: { fontSize: 15, color: '#999' },
  tabTextActive: { color: '#ff6b35', fontWeight: '600' },
  offlineHint: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  // 路线规划按钮
  routeBtn: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 8, padding: 14,
    borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ff6b35', borderStyle: 'dashed',
  },
  routeBtnText: { fontSize: 15, fontWeight: '700', color: '#ff6b35' },
  routeBtnHint: { fontSize: 11, color: '#999', marginTop: 4 },
});

const ms = StyleSheet.create({
  section: { backgroundColor: '#fff', margin: 12, marginBottom: 0, padding: 20, borderRadius: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  stepperBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff2e8', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#ff6b35' },
  stepperText: { fontSize: 22, fontWeight: '700', color: '#ff6b35', lineHeight: 24 },
});
