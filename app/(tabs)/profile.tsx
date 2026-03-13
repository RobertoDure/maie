import { AvatarPickerSheet } from '@/components/avatar-picker-sheet';
import { ProfileAvatar } from '@/components/profile-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, SemanticColors, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { UserProfileService } from '@/lib/services';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
  const { user, signOut, role } = useAuth();
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const loadAvatar = useCallback(async () => {
    if (!user?.id) return;
    try {
      const profile = await UserProfileService.getProfile(user.id);
      setAvatarUrl(profile?.avatar_url ?? null);
    } catch {
      // silently fail — placeholder shown
    }
  }, [user?.id]);

  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  const handleImageSelected = async (uri: string) => {
    if (!user?.id) return;
    try {
      setAvatarLoading(true);
      const publicUrl = await UserProfileService.uploadAvatar(user.id, uri);
      setAvatarUrl(publicUrl);
    } catch {
      Alert.alert('Error', 'Failed to upload profile photo.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id) return;
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setAvatarLoading(true);
            await UserProfileService.removeAvatar(user.id);
            setAvatarUrl(null);
          } catch {
            Alert.alert('Error', 'Failed to remove profile photo.');
          } finally {
            setAvatarLoading(false);
          }
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <ProfileAvatar
            size={100}
            uri={avatarUrl}
            showEditButton
            onEditPress={() => sheetRef.current?.expand()}
            loading={avatarLoading}
          />
          <View style={{ height: 16 }} />
          <Text style={styles.name}>{user?.email}</Text>
          {role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/personal-info')}>
            <IconSymbol name="person" size={20} color={NeutralColors.gray400} />
            <Text style={styles.menuText}>Personal Information</Text>
            <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/notifications')}>
            <IconSymbol name="bell" size={20} color={NeutralColors.gray400} />
            <Text style={styles.menuText}>Notifications</Text>
            <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/privacy-security')}>
            <IconSymbol name="lock" size={20} color={NeutralColors.gray400} />
            <Text style={styles.menuText}>Privacy & Security</Text>
            <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.menuItem}>
            <IconSymbol name="questionmark.circle" size={20} color={NeutralColors.gray400} />
            <Text style={styles.menuText}>Help Center</Text>
            <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <IconSymbol name="bubble.left.and.bubble.right" size={20} color={NeutralColors.gray400} />
            <Text style={styles.menuText}>Contact Support</Text>
            <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      <AvatarPickerSheet
        ref={sheetRef}
        onImageSelected={handleImageSelected}
        onRemovePhoto={handleRemovePhoto}
        hasExistingAvatar={!!avatarUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: NeutralColors.gray900,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...Shadows.md,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: NeutralColors.gray900,
  },
  roleBadge: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: NeutralColors.gray900,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    ...Shadows.sm,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: NeutralColors.gray900,
  },
  signOutButton: {
    backgroundColor: SemanticColors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: NeutralColors.gray400,
    fontSize: 14,
    marginTop: 24,
  },
});

