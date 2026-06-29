import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useDispatch} from 'react-redux';

import CustomTextInput from '../components/CustomTextInput';
import {fetchUser, saveUser as saveUserAPI, updateUser} from '../api/users';
import {setUser} from '../store/authSlice';

export default function AccountSetupScreen({navigation, route}) {
  const dispatch = useDispatch();
  const phone = route.params?.phone;

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill from an existing account if the phone is already registered.
  const loadUser = async () => {
    if (!phone) {
      return;
    }
    const data = await fetchUser(phone);
    if (data) {
      setName(data.name || '');
      setId(data._id ? String(data._id) : '');
      setProfileImage(data.profileImage || '');
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 1,
    });
    if (result.didCancel) {
      return;
    }
    if (result.errorCode) {
      Alert.alert('Image error', result.errorMessage || 'Could not pick image');
      return;
    }
    const asset = result.assets?.[0];
    if (asset?.uri) {
      setProfileImage(asset.uri);
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name before proceeding');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('name', name);

      // Only upload a freshly picked local file (not an existing remote URL).
      if (profileImage && profileImage.startsWith('file://')) {
        const fileName = profileImage.split('/').pop() || 'profile.jpg';
        const fileType = (fileName.split('.').pop() || '').toLowerCase();
        const mimeType = fileType === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('profileImage', {
          uri: profileImage,
          type: mimeType,
          name: fileName,
        });
      }

      setLoading(true);
      const response = id
        ? await updateUser(id, formData)
        : await saveUserAPI(formData);

      if (response) {
        await dispatch(setUser(response)).unwrap();
        navigation.reset({index: 0, routes: [{name: 'Tabs'}]});
      } else {
        Alert.alert('Error', 'Something went wrong while saving your profile');
      }
    } catch (error) {
      console.log('Error saving profile', error?.message || error);
      Alert.alert('Error', 'Something went wrong while saving your profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    const onBackPress = () => {
      navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <View className="items-center flex-1 p-6 bg-white">
      <Text className="mb-4 text-3xl font-bold">Set up your Profile</Text>

      {/* Profile Image */}
      <TouchableOpacity className="mb-6" onPress={pickImage}>
        {profileImage ? (
          <Image
            className="w-32 h-32 border-2 border-gray-300 rounded-full"
            source={{uri: profileImage}}
          />
        ) : (
          <View className="items-center justify-center w-32 h-32 bg-gray-200 border-2 border-gray-400 rounded-full">
            <Text>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Name Input */}
      <CustomTextInput
        className="w-full p-4 mb-4 text-lg border border-gray-300 rounded-lg"
        placeholder="Enter Your Name"
        value={name}
        onChangeText={setName}
      />

      {/* Save Button */}
      <TouchableOpacity
        className="w-full p-4 bg-green-500 rounded-full"
        onPress={saveProfile}>
        <Text className="text-lg font-bold text-center text-white">
          Save & Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}
