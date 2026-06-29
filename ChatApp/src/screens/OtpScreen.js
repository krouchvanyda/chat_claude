import React, {useEffect, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import CustomTextInput from '../components/CustomTextInput';

export default function OtpScreen({navigation, route}) {
  const {phone} = route.params || {};
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');

  // Generate a 6-digit OTP (client-side demo, as in the original app).
  const generateRandomOTP = () => {
    const randomOTP = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(randomOTP);
    console.log('Generated OTP', randomOTP); // Debug
  };

  const resendOtp = () => {
    generateRandomOTP();
    setTimer(30);
  };

  const handleVerify = () => {
    setError('');
    if (otp.length !== 6) {
      setError('OTP must be 6 digits.');
      return;
    }
    if (otp !== generatedOTP) {
      setError('Incorrect OTP. Please try again.');
      return;
    }
    navigation.navigate('AccountSetup', {phone});
  };

  // Generate OTP & start the resend timer on mount.
  useEffect(() => {
    generateRandomOTP();
    const interval = setInterval(
      () => setTimer(prev => (prev > 0 ? prev - 1 : 0)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="items-center justify-center flex-1 px-5 bg-white">
      {/* Title */}
      <Text className="mb-4 text-3xl font-bold text-gray-900">Enter OTP</Text>

      {/* Description */}
      <Text className="mb-6 text-lg text-center text-gray-500">
        A 6-digit code has been sent to {phone} ({generatedOTP})
      </Text>

      {/* OTP Input */}
      <CustomTextInput
        className="w-3/4 p-4 text-lg text-center border border-gray-300 rounded-lg"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
      />

      {/* Error Message */}
      {error ? <Text className="mt-3 text-red-500">{error}</Text> : null}

      {/* Verify Button */}
      <TouchableOpacity
        onPress={handleVerify}
        className="w-full p-4 mt-6 bg-green-500 rounded-full">
        <Text className="text-lg font-bold text-center text-white">Verify</Text>
      </TouchableOpacity>

      {/* Change Number */}
      <TouchableOpacity
        className="mt-4"
        onPress={() => navigation.navigate('Login')}>
        <Text className="text-lg text-blue-500">Change Number</Text>
      </TouchableOpacity>

      {/* Resend */}
      <TouchableOpacity
        disabled={timer > 0}
        className="mt-3"
        onPress={resendOtp}>
        <Text className={timer ? 'text-gray-400' : 'text-blue-400'}>
          {timer > 0 ? `Resend OTP in ${timer} secs` : 'Resend'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
