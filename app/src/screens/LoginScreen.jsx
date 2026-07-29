/**
 * 登录页 — 商家和骑手共用
 * 输入手机号+密码，登录后自动识别角色跳转到对应面板
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, connectSocket } from '../api';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      return Alert.alert('提示', '请输入手机号和密码');
    }
    if (!/^1\d{10}$/.test(phone)) {
      return Alert.alert('提示', '请输入正确的11位手机号');
    }

    setLoading(true);
    try {
      const result = await authAPI.login(phone, password);
      const user = result.data.user;

      // 只有商家和骑手能登录APP
      if (user.role === 'customer') {
        return Alert.alert('提示', '顾客请在微信小程序下单');
      }

      // 保存登录状态
      await AsyncStorage.setItem('token', result.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // 连接 WebSocket
      connectSocket(result.data.token);

      // 根据角色跳转
      if (user.role === 'merchant') {
        navigation.replace('Merchant');
      } else if (user.role === 'rider') {
        navigation.replace('Rider');
      }
    } catch (err) {
      Alert.alert('登录失败', err.message || '请检查手机号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>🛵</Text>
        <Text style={styles.title}>外卖配送</Text>
        <Text style={styles.subtitle}>商家 & 骑手端</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>手机号</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入手机号"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />

        <Text style={styles.label}>密码</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? '登录中...' : '登录'}
          </Text>
        </TouchableOpacity>

        {__DEV__ && (
        <Text style={styles.hint}>
          测试：商家 13800000001 / 骑手 13800000003{'\n'}密码均为 123456
        </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  form: { paddingHorizontal: 32 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 16 },
  input: {
    height: 50, borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 12, paddingHorizontal: 16, fontSize: 16,
    backgroundColor: '#fafafa',
  },
  btn: {
    height: 50, backgroundColor: '#ff6b35', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 32,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  hint: {
    textAlign: 'center', color: '#bbb', fontSize: 12,
    marginTop: 24, lineHeight: 20,
  },
});
