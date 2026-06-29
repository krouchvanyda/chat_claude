import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Image, Text, TouchableOpacity, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useDispatch, useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';

import CustomTextInput from '../components/CustomTextInput';
import {logout} from '../store/authSlice';
import {
  loadConversations,
  upsertConversation,
  clearChat,
} from '../store/chatSlice';
import {disconnectSocket, onReceiveMessage} from '../services/socket';
import {
  avatarUri,
  formatTime,
  getOtherParticipant,
  lastMessageText,
  unreadFor,
} from '../utils/chat';

export default function ChatsScreen({navigation}) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const conversations = useSelector(state => state.chat.conversations);

  // (Re)load conversations whenever this tab gains focus.
  useFocusEffect(
    useCallback(() => {
      if (user?._id) {
        dispatch(loadConversations(user._id));
      }
    }, [dispatch, user?._id]),
  );

  // Keep the list fresh as messages arrive over the socket.
  useEffect(() => {
    const unsubscribe = onReceiveMessage(({conversation}) => {
      if (conversation) {
        dispatch(upsertConversation(conversation));
      }
    });
    return unsubscribe;
  }, [dispatch]);

  const handleLogout = async () => {
    disconnectSocket();
    dispatch(clearChat());
    await dispatch(logout()).unwrap();
    navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
  };

  return (
    <View className="flex-1 bg-white">
      <Header onLogout={handleLogout} />
      <ChatList
        conversations={conversations}
        currentUserId={user?._id}
        onOpen={conversation => {
          const other = getOtherParticipant(conversation, user?._id);
          navigation.navigate('Chat', {
            conversationId: conversation._id,
            otherUser: other,
          });
        }}
      />

      {/* Start a new conversation */}
      <TouchableOpacity
        className="absolute items-center justify-center bg-green-500 rounded-full w-14 h-14 right-5 bottom-6"
        onPress={() => navigation.navigate('NewChat')}>
        <MaterialIcons name="add-comment" size={26} color="white" />
      </TouchableOpacity>
    </View>
  );
}

function Header({onLogout}) {
  return (
    <View className="flex-row items-center justify-between pt-10 bg-white">
      <Text className="px-4 text-2xl font-bold text-green-700">ChatApp</Text>
      <View className="flex-row gap-5 pr-4 mb-4">
        <TouchableOpacity>
          <Ionicons size={24} name="qr-code-outline" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout}>
          <Feather size={24} name="log-out" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SearchBar() {
  return (
    <View className="flex-row items-center px-4 py-3 mx-4 mb-3 bg-gray-200 rounded-full">
      <Ionicons name="search" size={20} color="gray" />
      <CustomTextInput
        className="flex-1 ml-2 text-base"
        placeholder="Search"
        placeholderTextColor="gray"
      />
    </View>
  );
}

function CategoryTabs() {
  const categories = ['All', 'Unread', 'Favorites', 'Groups'];
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <View className="flex-row gap-5 px-4 mb-3">
      {categories.map(c => (
        <TouchableOpacity
          key={c}
          onPress={() => setActiveCategory(c)}
          className={`${
            activeCategory === c ? 'bg-green-200' : 'bg-gray-200'
          } px-3 py-1 rounded-full`}>
          <Text className="text-sm">{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ChatList({conversations, currentUserId, onOpen}) {
  if (!conversations || conversations.length === 0) {
    return <EmptyChats />;
  }

  return (
    <FlatList
      contentContainerStyle={{paddingBottom: 100}}
      ListHeaderComponent={
        <>
          <SearchBar />
          <CategoryTabs />
        </>
      }
      ListFooterComponent={
        <View className="items-center justify-center py-6">
          <MaterialCommunityIcons name="lock-outline" size={16} color="gray" />
          <Text className="mt-2 text-xs text-gray-500">
            Your personal messages are not end to end encrypted
          </Text>
        </View>
      }
      data={conversations}
      keyExtractor={item => String(item._id)}
      renderItem={({item}) => {
        const other = getOtherParticipant(item, currentUserId);
        const unread = unreadFor(item, currentUserId);
        return (
          <TouchableOpacity
            className="flex-row items-center px-4 py-2"
            onPress={() => onOpen(item)}>
            <Image
              className="w-12 h-12 rounded-full"
              source={{uri: avatarUri(other)}}
            />
            <View className="flex-1 ml-4">
              <View className="flex-row justify-between">
                <Text className="text-lg font-semibold text-black">
                  {other?.name || other?.phone || 'Unknown'}
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatTime(item?.lastMessage?.createdAt || item?.updated_at)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text
                  numberOfLines={1}
                  className="flex-1 mr-5 text-base text-gray-500">
                  {lastMessageText(item)}
                </Text>
                {unread > 0 && (
                  <View className="bg-green-600 min-w-[20px] rounded-full items-center justify-center px-2 ml-2">
                    <Text className="text-xs font-bold text-white">
                      {unread}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

function EmptyChats() {
  return (
    <View className="items-center justify-center flex-1 p-6 bg-white">
      <MaterialIcons name="chat-bubble-outline" size={100} />
      <Text className="mt-6 text-xl font-semibold">
        Start Chatting on ChatApp
      </Text>
      <Text className="mt-2 text-center text-gray-500">
        Your conversations will appear here
      </Text>
    </View>
  );
}
