import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';

export default function WelcomeScreen({navigation}) {
  const user = useSelector(state => state.auth.user);

  // If a user is already persisted, skip straight to the chat tabs.
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        navigation.replace('Tabs');
      }
    }, [user, navigation]),
  );

  return (
    <View className="items-center justify-center flex-1 px-5 bg-white">
      {/* Logo */}
      <Image
        className="mb-10 w-28 h-28"
        source={require('../assets/images/WhatsApp.png')}
      />

      {/* Welcome Text */}
      <Text className="mb-4 text-3xl font-bold text-center text-gray-900">
        Welcome to ChatApp!
      </Text>

      {/* Privacy Terms */}
      <Text className="mb-8 text-lg text-center">
        Read Our
        <Text className="text-blue-500"> Privacy Policy</Text>. Tap "Agree &
        Continue" to accept the
        <Text className="text-blue-500"> Terms and Conditions</Text>
      </Text>

      {/* Agree & Continue Button */}
      <TouchableOpacity
        className="w-full px-6 py-4 bg-green-500 rounded-full"
        onPress={() => navigation.navigate('Login')}>
        <Text className="text-lg font-bold text-center text-white">
          Agree & Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}
