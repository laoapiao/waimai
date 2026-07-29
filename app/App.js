/**
 * 外卖配送APP — 商家 & 骑手端
 *
 * 导航结构：
 * - Login → 登录页
 * - Merchant → 商家面板 + 订单详情
 * - Rider → 骑手面板 + 订单详情
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import MerchantScreen from './src/screens/MerchantScreen';
import RiderScreen from './src/screens/RiderScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#ff6b35' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Merchant"
          component={MerchantScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Rider"
          component={RiderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: '订单详情' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
