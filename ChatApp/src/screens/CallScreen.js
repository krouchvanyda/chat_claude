import React, {useEffect, useState} from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {avatarUri} from '../utils/chat';

/**
 * Placeholder full-screen call UI shown after call permissions are granted.
 * There's no real-time calling backend yet, so this simulates an ongoing call
 * (ringing -> connected timer) with an end-call button. Wiring react-native-webrtc
 * (signalling over the existing Socket.IO server) would replace the simulation.
 */
export default function CallScreen({navigation, route}) {
  const {otherUser, kind} = route.params || {};
  const isVideo = kind === 'video';
  const name = otherUser?.name || otherUser?.phone || 'Unknown';

  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(isVideo);
  const [seconds, setSeconds] = useState(0);

  // Simulate ringing for 2s, then count up the call duration.
  useEffect(() => {
    const ring = setTimeout(() => setSeconds(1), 2000);
    return () => clearTimeout(ring);
  }, []);

  useEffect(() => {
    if (seconds < 1) {
      return undefined;
    }
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [seconds < 1]);

  const status =
    seconds < 1
      ? 'Ringing…'
      : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
          seconds % 60,
        ).padStart(2, '0')}`;

  return (
    <View className="items-center justify-between flex-1 py-16 bg-gray-900">
      {/* Callee */}
      <View className="items-center mt-12">
        <Image
          className="w-32 h-32 border-2 border-gray-700 rounded-full"
          source={{uri: avatarUri(otherUser)}}
        />
        <Text className="mt-6 text-2xl font-semibold text-white">{name}</Text>
        <Text className="mt-2 text-base text-gray-300">
          {isVideo ? 'Video call' : 'Voice call'} · {status}
        </Text>
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-center gap-6">
        <TouchableOpacity
          onPress={() => setMuted(m => !m)}
          className={`items-center justify-center w-14 h-14 rounded-full ${
            muted ? 'bg-white' : 'bg-gray-700'
          }`}>
          <Ionicons
            name={muted ? 'mic-off' : 'mic'}
            size={24}
            color={muted ? '#111827' : 'white'}
          />
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            onPress={() => setCameraOn(c => !c)}
            className={`items-center justify-center w-14 h-14 rounded-full ${
              cameraOn ? 'bg-gray-700' : 'bg-white'
            }`}>
            <Ionicons
              name={cameraOn ? 'videocam' : 'videocam-off'}
              size={24}
              color={cameraOn ? 'white' : '#111827'}
            />
          </TouchableOpacity>
        )}

        {/* End call */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="items-center justify-center bg-red-600 w-14 h-14 rounded-full">
          <Ionicons
            name="call"
            size={26}
            color="white"
            style={{transform: [{rotate: '135deg'}]}}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
