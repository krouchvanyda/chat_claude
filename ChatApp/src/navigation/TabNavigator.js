import React from 'react';
import {Text, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import ChatsScreen from '../screens/ChatsScreen';
import UpdatesScreen from '../screens/UpdatesScreen';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import CallsScreen from '../screens/CallsScreen';

const Tab = createBottomTabNavigator();

const TAB_META = {
  Chats: {Icon: Ionicons, icon: 'chatbubble', title: 'Chats'},
  Updates: {Icon: MaterialIcons, icon: 'update', title: 'Updates'},
  Communities: {Icon: Ionicons, icon: 'people', title: 'Communities'},
  Calls: {Icon: Ionicons, icon: 'call', title: 'Calls'},
};

function renderTabIcon(routeName, focused) {
  const meta = TAB_META[routeName];
  if (!meta) {
    return null;
  }
  const {Icon, icon, title} = meta;
  const iconColor = focused ? '#075E54' : 'black';

  return (
    <View className="w-[100px] h-[58px] items-center justify-center">
      <View
        className={`${
          focused ? 'bg-green-200' : 'bg-transparent'
        } px-5 py-1.5 rounded-full relative`}>
        <Icon size={18} name={icon} color={iconColor} />

        {routeName === 'Chats' && (
          <View className="absolute top-0 -right-0 bg-green-600 rounded-full px-1.5">
            <Text className="text-xs font-bold text-white">5</Text>
          </View>
        )}
        {routeName === 'Updates' && (
          <View className="absolute top-0 w-2 h-2 bg-green-600 rounded-full -right-0" />
        )}
      </View>
      <View>
        <Text className={focused ? 'font-semibold' : 'font-normal'}>
          {title}
        </Text>
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {height: 80},
        tabBarShowLabel: false,
        tabBarIcon: ({focused}) => renderTabIcon(route.name, focused),
      })}>
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Updates" component={UpdatesScreen} />
      <Tab.Screen name="Communities" component={CommunitiesScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
    </Tab.Navigator>
  );
}
