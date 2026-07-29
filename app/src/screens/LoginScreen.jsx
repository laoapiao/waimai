/**
 * 登录/注册 — 骑手 & 商家共用
 * 支持：密码登录 | 验证码登录 | 新用户注册
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, connectSocket } from '../api';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loginType, setLoginType] = useState('password'); // 'password' | 'sms'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (result) => {
    const user = result.data.user;
    if (user.role === 'customer') return Alert.alert('提示', '顾客请在微信小程序下单');
    await AsyncStorage.setItem('token', result.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    connectSocket(result.data.token);
    navigation.replace(user.role === 'merchant' ? 'Merchant' : 'Rider');
  };

  const handleLogin = async () => {
    if (!phone || !/^1\d{10}$/.test(phone)) return Alert.alert('提示', '请输入正确的手机号');
    if (loginType === 'sms' && !smsCode) return Alert.alert('提示', '请输入验证码');
    if (loginType === 'password' && !password) return Alert.alert('提示', '请输入密码');
    setLoading(true);
    try {
      const result = loginType === 'sms'
        ? await authAPI.verifyCode(phone, smsCode)
        : await authAPI.login(phone, password);
      await doLogin(result);
    } catch (err) {
      Alert.alert('登录失败', err.message || '请重试');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!phone || !/^1\d{10}$/.test(phone)) return Alert.alert('提示', '请输入正确的手机号');
    if (!password || password.length < 6) return Alert.alert('提示', '密码至少6位');
    setLoading(true);
    try {
      const result = await authAPI.register({
        phone, password,
        role: 'rider',
        nickname: nickname || '骑手' + phone.slice(-4),
      });
      Alert.alert('注册成功', '请登录');
      setMode('login');
    } catch (err) {
      Alert.alert('注册失败', err.message || '请重试');
    } finally { setLoading(false); }
  };

  const handleSendCode = async () => {
    if (!phone || !/^1\d{10}$/.test(phone)) return Alert.alert('提示', '请输入手机号');
    try {
      await authAPI.sendCode(phone);
      Alert.alert('验证码已发送', '开发模式验证码: 888888');
    } catch (err) { Alert.alert('发送失败', err.message); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.header}>
          <Text style={styles.logo}>🛵</Text>
          <Text style={styles.title}>阿飘菜市·配送端</Text>
          <Text style={styles.subtitle}>{mode === 'login' ? '商家 & 骑手登录' : '骑手注册'}</Text>
        </View>

        <View style={styles.form}>
          {/* 模式切换 */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
              <Text style={[styles.tabText, mode === 'login' && styles.tabActiveText]}>登录</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
              <Text style={[styles.tabText, mode === 'register' && styles.tabActiveText]}>注册</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <>
              <Text style={styles.label}>昵称</Text>
              <TextInput style={styles.input} placeholder="给自己取个名字" value={nickname} onChangeText={setNickname} maxLength={20} />
            </>
          )}

          <Text style={styles.label}>手机号</Text>
          <TextInput style={styles.input} placeholder="请输入手机号" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />

          {mode === 'login' && (
            <View style={styles.loginTypeRow}>
              <TouchableOpacity onPress={() => setLoginType('password')} style={{ flex: 1, alignItems: 'center', padding: 8, borderBottomWidth: 2, borderBottomColor: loginType === 'password' ? '#ff6b35' : '#eee' }}>
                <Text style={{ color: loginType === 'password' ? '#ff6b35' : '#999', fontWeight: '600' }}>密码登录</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLoginType('sms')} style={{ flex: 1, alignItems: 'center', padding: 8, borderBottomWidth: 2, borderBottomColor: loginType === 'sms' ? '#ff6b35' : '#eee' }}>
                <Text style={{ color: loginType === 'sms' ? '#ff6b35' : '#999', fontWeight: '600' }}>验证码登录</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'login' && loginType === 'password' && (
            <>
              <Text style={styles.label}>密码</Text>
              <TextInput style={styles.input} placeholder="请输入密码" value={password} onChangeText={setPassword} secureTextEntry />
            </>
          )}

          {mode === 'login' && loginType === 'sms' && (
            <>
              <Text style={styles.label}>验证码</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="输入验证码" value={smsCode} onChangeText={setSmsCode} keyboardType="numeric" maxLength={6} />
                <TouchableOpacity onPress={handleSendCode} style={styles.codeBtn}><Text style={{ color: '#fff', fontWeight: '600' }}>获取验证码</Text></TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'register' && (
            <>
              <Text style={styles.label}>设置密码</Text>
              <TextInput style={styles.input} placeholder="至少6位" value={password} onChangeText={setPassword} secureTextEntry />
            </>
          )}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? '处理中...' : mode === 'login' ? '登 录' : '注 册'}</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <Text style={styles.hint}>开发测试：13800000001 / 123456</Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 24 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  form: { paddingHorizontal: 32 },
  tabRow: { flexDirection: 'row', marginBottom: 20, borderRadius: 10, backgroundColor: '#f5f5f5' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#ff6b35' },
  tabText: { fontSize: 16, color: '#999', fontWeight: '600' },
  tabActiveText: { color: '#fff' },
  loginTypeRow: { flexDirection: 'row', marginVertical: 12 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 12 },
  input: { height: 50, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, backgroundColor: '#fafafa' },
  codeBtn: { backgroundColor: '#ff6b35', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  btn: { height: 50, backgroundColor: '#ff6b35', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  hint: { textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 24, lineHeight: 20 },
});
