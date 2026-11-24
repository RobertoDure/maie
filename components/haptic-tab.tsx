import type { BottomTabBarButtonProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { ref: _ref, ...buttonProps } = props;

  return (
    <Pressable
      {...buttonProps}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        buttonProps.onPressIn?.(ev);
      }}
    />
  );
}
