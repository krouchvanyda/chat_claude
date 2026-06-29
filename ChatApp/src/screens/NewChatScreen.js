import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';

import CustomTextInput from '../components/CustomTextInput';
import {fetchUser} from '../api/users';

/**
 * Start a new conversation by phone number.
 *
 * Looks the recipient up via GET /api/users/{phone} (returns their numeric
 * `_id`), then opens the existing ChatScreen. ChatScreen works without a
 * pre-existing conversationId — the backend creates the conversation when the
 * first `send-message` is emitted.
 */
export default function NewChatScreen({navigation}) {
  const currentUser = useSelector(state => state.auth.user);

  const [phone, setPhone] = useState('+885');
  const [loading, setLoading] = useState(false);

  // Country code + 10 digits (same rule as the login screen).
  const isValidNumber = /^\+\d{1,3}\s?\d{10}$/.test(phone);

  const startChat = async () => {
    if (!isValidNumber) {
      Alert.alert('Invalid number', 'Enter a valid phone number.');
      return;
    }

    try {
      setLoading(true);
      const other = await fetchUser(phone);

      if (!other) {
        Alert.alert(
          'No user found',
          'No ChatApp user is registered with that number yet. Make sure they finished Account Setup on their device.',
        );
        return;
      }

      if (String(other._id) === String(currentUser?._id)) {
        Alert.alert("That's you", "You can't start a chat with your own number.");
        return;
      }

      // Reuse the existing thread screen; no conversationId needed for a new chat.
      navigation.navigate('Chat', {otherUser: other});
    } catch (error) {
      console.log('NewChat lookup error', error?.message || error);
      Alert.alert('Error', 'Could not look up that number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <View className="flex-1 p-6 bg-white">
      <Text className="mb-2 text-lg font-semibold text-gray-900">
        Enter a phone number
      </Text>
      <Text className="mb-6 text-sm text-gray-500">
        Start a chat with another ChatApp user by their registered number.
      </Text>

      <CustomTextInput
        className="w-full p-4 text-lg border border-gray-300 rounded-lg"
        placeholder="+885 9876543210"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        autoFocus
      />

      <TouchableOpacity
        className={`p-4 w-full mt-6 rounded-full ${
          isValidNumber ? 'bg-green-500' : 'bg-gray-300'
        }`}
        disabled={!isValidNumber}
        onPress={startChat}>
        <Text className="text-lg font-bold text-center text-white">
          Start chat
        </Text>
      </TouchableOpacity>
    </View>
  );
}
