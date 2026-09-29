import { Stack } from 'expo-router';
import React from 'react';

export default function CommunityLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="chat/new" />
      <Stack.Screen name="chat/invite" />
    </Stack>
  );
}
