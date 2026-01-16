import { Stack } from 'expo-router';
import React from 'react';

export default function CycleLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="new" />
            <Stack.Screen name="[id]/index" />
            <Stack.Screen name="[id]/appointments" />
            <Stack.Screen name="[id]/share" />
        </Stack>
    );
}
