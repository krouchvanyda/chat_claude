import React from 'react';
import {useSelector} from 'react-redux';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import AccountSetupScreen from '../screens/AccountSetupScreen';
import TabNavigator from './TabNavigator';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import CallScreen from '../screens/CallScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const user = useSelector(state => state.auth.user);

  return (
    <Stack.Navigator
      initialRouteName={user ? 'Tabs' : 'Welcome'}
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{headerShown: true}}
      />
      <Stack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{headerShown: true, title: 'New chat'}}
      />
      <Stack.Screen name="Call" component={CallScreen} />
    </Stack.Navigator>
  );
}
