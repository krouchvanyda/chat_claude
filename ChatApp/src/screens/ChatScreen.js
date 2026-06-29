import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useDispatch, useSelector} from 'react-redux';

import CustomTextInput from '../components/CustomTextInput';
import {addMessage, setMessages} from '../store/chatSlice';
import {fetchMessages} from '../api/messages';
import {
  focusConversation,
  joinChat,
  onReceiveMessage,
  sendMessage,
} from '../services/socket';
import {formatTime} from '../utils/chat';

// Resolve a message's sender id. Optimistic local messages use `sender`; the
// backend (REST history + socket payload) uses `senderId`. Accept either.
const senderId = message => {
  const s = message?.sender ?? message?.senderId;
  return s && typeof s === 'object' ? s._id : s;
};

// Stable reference for the "no messages yet" case so the selector below doesn't
// return a brand-new [] each render (which triggers React-Redux's
// "selector returned a different result" warning + needless re-renders).
const EMPTY_MESSAGES = [];

// Request the Android runtime permissions a call needs. Returns true if every
// requested permission is granted. (iOS would prompt natively at capture time.)
const requestCallPermissions = async permissions => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const result = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every(
      p => result[p] === PermissionsAndroid.RESULTS.GRANTED,
    );
  } catch (err) {
    console.log('Call permission request error', err?.message);
    return false;
  }
};

export default function ChatScreen({navigation, route}) {
  const dispatch = useDispatch();
  const {conversationId, otherUser} = route.params || {};
  const otherUserId = otherUser?._id;

  const currentUser = useSelector(state => state.auth.user);
  const messages = useSelector(
    state => state.chat.messagesByUser[String(otherUserId)] || EMPTY_MESSAGES,
  );

  const [text, setText] = useState('');
  const listRef = useRef(null);

  const otherName = otherUser?.name || otherUser?.phone || 'Chat';

  // Ask for the needed permission first. If granted, open the call screen;
  // if denied, just close (no alert, no re-prompt loop).
  const startCall = useCallback(
    async kind => {
      const perms =
        kind === 'video'
          ? [
              PermissionsAndroid.PERMISSIONS.CAMERA,
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ]
          : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

      const granted = await requestCallPermissions(perms);
      if (!granted) {
        return;
      }
      navigation.navigate('Call', {otherUser, kind});
    },
    [navigation, otherUser],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: otherName,
      headerRight: () => (
        <View className="flex-row items-center mr-1">
          <TouchableOpacity
            className="px-2 py-1"
            onPress={() => startCall('voice')}
            accessibilityLabel="Start voice call">
            <Ionicons name="call" size={22} color="#075E54" />
          </TouchableOpacity>
          <TouchableOpacity
            className="px-2 py-1 ml-1"
            onPress={() => startCall('video')}
            accessibilityLabel="Start video call">
            <Ionicons name="videocam" size={24} color="#075E54" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, otherName, startCall]);

  // Load past messages for an existing conversation (new chats have no id yet).
  useEffect(() => {
    if (!conversationId || !otherUserId) {
      return;
    }
    fetchMessages(conversationId).then(history => {
      dispatch(setMessages({otherUserId, messages: history}));
    });
  }, [conversationId, otherUserId, dispatch]);

  // Open the peer's room, reset unread, and subscribe to incoming messages.
  useEffect(() => {
    if (!otherUserId) {
      return undefined;
    }
    joinChat(otherUserId);
    if (conversationId) {
      focusConversation(conversationId);
    }

    const unsubscribe = onReceiveMessage(({message}) => {
      // Only append messages that belong to this thread.
      if (String(senderId(message)) === String(otherUserId)) {
        dispatch(addMessage({otherUserId, message}));
      }
    });
    return unsubscribe;
  }, [conversationId, dispatch, otherUserId]);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({animated: true}),
      );
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !otherUserId) {
      return;
    }
    // Emit over the socket and optimistically render our own message.
    sendMessage(otherUserId, trimmed);
    dispatch(
      addMessage({
        otherUserId,
        message: {
          _id: `local-${messages.length}-${trimmed.length}`,
          text: trimmed,
          sender: currentUser?._id,
          createdAt: new Date().toISOString(),
        },
      }),
    );
    setText('');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        className="flex-1"
        contentContainerStyle={{padding: 12, paddingBottom: 20}}
        data={messages}
        keyExtractor={(item, index) => String(item?._id ?? index)}
        renderItem={({item}) => {
          const mine = String(senderId(item)) === String(currentUser?._id);
          return (
            <View
              className={`max-w-[80%] my-1 px-3 py-2 rounded-2xl ${
                mine ? 'self-end bg-green-500' : 'self-start bg-gray-200'
              }`}>
              <Text className={mine ? 'text-white' : 'text-black'}>
                {item.text}
              </Text>
              <Text
                className={`text-[10px] mt-1 ${
                  mine ? 'text-green-100' : 'text-gray-500'
                }`}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center mt-10">
            <Text className="text-gray-400">
              No messages yet. Say hello! 👋
            </Text>
          </View>
        }
      />

      {/* Composer */}
      <View className="flex-row items-center px-3 py-2 border-t border-gray-200">
        <CustomTextInput
          className="flex-1 px-4 py-2 mr-2 bg-gray-100 rounded-full"
          placeholder="Type a message"
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          className="items-center justify-center w-12 h-12 bg-green-500 rounded-full"
          onPress={handleSend}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
