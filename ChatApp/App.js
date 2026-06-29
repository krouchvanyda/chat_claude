import './global.css';

import React, {useEffect} from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {Provider, useDispatch, useSelector} from 'react-redux';

import store from './src/store';
import {loadUserFromStorage} from './src/store/authSlice';
import {connectSocket, disconnectSocket} from './src/services/socket';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const dispatch = useDispatch();
  const {user, bootstrapped} = useSelector(state => state.auth);

  // Check persisted login once on startup.
  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  // Open/close the realtime socket as the logged-in user changes.
  useEffect(() => {
    if (user?._id) {
      connectSocket(user._id);
    }
    return () => disconnectSocket();
  }, [user?._id]);

  if (!bootstrapped) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <Provider store={store}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <AppContent />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
