import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Shadows } from '@/constants/theme';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

interface ProfileAvatarProps {
  /** Diameter of the avatar circle (default 100) */
  size?: number;
  /** Remote or local URI for the avatar image */
  uri?: string | null;
  /** Show the pencil edit button overlay */
  showEditButton?: boolean;
  /** Called when the edit button is pressed */
  onEditPress?: () => void;
  /** Show a loading spinner over the avatar */
  loading?: boolean;
}

export function ProfileAvatar({
  size = 100,
  uri,
  showEditButton = false,
  onEditPress,
  loading = false,
}: ProfileAvatarProps) {
  const iconSize = size * 0.48;
  const editButtonSize = size * 0.32;
  const editIconSize = editButtonSize * 0.5;

  const sizeStyles = useMemo(() => ({
    wrapper: { width: size, height: size },
    avatar: { width: size, height: size, borderRadius: size / 2 },
    editButton: {
      width: editButtonSize,
      height: editButtonSize,
      borderRadius: editButtonSize / 2,
      bottom: 0 as const,
      right: 0 as const,
    },
  }), [size, editButtonSize]);

  return (
    <View style={[styles.wrapper, sizeStyles.wrapper]}>
      <View
        style={[
          styles.avatarContainer,
          sizeStyles.avatar,
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={sizeStyles.avatar}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          />
        ) : (
          <IconSymbol name="person.fill" size={iconSize} color={BrandColors.primary} />
        )}

        {loading ? (
          <View
            style={[
              styles.loadingOverlay,
              sizeStyles.avatar,
            ]}
          >
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : null}
      </View>

      {showEditButton ? (
        <Pressable
          style={({ pressed }) => [
            styles.editButton,
            sizeStyles.editButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onEditPress}
        >
          <IconSymbol name="pencil" size={editIconSize} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  avatarContainer: {
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: NeutralColors.white,
    ...Shadows.sm,
  },
});
