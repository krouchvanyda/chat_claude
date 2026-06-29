import React, {useState} from 'react';
import {Alert, Text, TouchableOpacity, View} from 'react-native';
import CustomTextInput from '../components/CustomTextInput';

export default function LoginScreen({navigation}) {
  const [phone, setPhone] = useState('+885');

  // Phone number validation (country code + 10 digits).
  const isValidNumber = /^\+\d{1,3}\s?\d{10}$/.test(phone);

  const handleNext = () => {
    if (!isValidNumber) {
      Alert.alert('Invalid number', 'Enter a valid phone number.');
      return;
    }
    navigation.navigate('Otp', {phone});
  };

  return (
    <View className="items-center justify-center flex-1 px-5 bg-white">
      {/* Heading */}
      <Text className="mb-4 text-3xl font-bold text-gray-900">
        Enter Your Phone Number
      </Text>

      {/* Description */}
      <Text className="mb-6 text-lg text-center text-gray-500">
        ChatApp will send an SMS to verify your Number
      </Text>

      {/* Phone number Input */}
      <CustomTextInput
        className="w-full p-4 text-lg text-center border border-gray-300 rounded-lg"
        placeholder="+885 9876543210"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {/* Next Button */}
      <TouchableOpacity
        className={`p-4 w-full ${
          isValidNumber ? 'bg-green-500' : 'bg-gray-300'
        } rounded-full mt-6`}
        disabled={!isValidNumber}
        onPress={handleNext}>
        <Text className="text-lg font-bold text-center text-white">Next</Text>
      </TouchableOpacity>
    </View>
  );
}
