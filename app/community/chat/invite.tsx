import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ConversationService } from '@/lib/services';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UserResult = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
};

export default function InviteScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!user || query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await ConversationService.searchUsers(query.trim(), user.id);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [user]
  );

  const handleInvite = useCallback(
    async (targetUser: UserResult) => {
      if (!user || !conversationId) return;
      setInviting(targetUser.id);
      try {
        await ConversationService.inviteUser(conversationId, user.id, targetUser.id);
        Alert.alert('Sent', `Invitation sent to ${targetUser.full_name || targetUser.email}`);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setInviting(null);
      }
    },
    [user, conversationId]
  );

  const renderUserResult = useCallback(
    ({ item }: { item: UserResult }) => (
      <View style={styles.userRow}>
        <View style={styles.userAvatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <IconSymbol name="person.fill" size={18} color={NeutralColors.gray300} />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name || 'Anonymous'}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <Pressable
          onPress={() => handleInvite(item)}
          disabled={inviting === item.id}
          style={({ pressed }) => [
            styles.inviteButton,
            pressed && { opacity: 0.7 },
            inviting === item.id && { opacity: 0.5 },
          ]}
        >
          {inviting === item.id ? (
            <ActivityIndicator size="small" color={NeutralColors.white} />
          ) : (
            <Text style={styles.inviteButtonText}>Invite</Text>
          )}
        </Pressable>
      </View>
    ),
    [handleInvite, inviting]
  );

  const userKeyExtractor = useCallback((item: UserResult) => item.id, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol name="chevron.left" size={24} color={NeutralColors.gray900} />
        </Pressable>
        <Text style={styles.headerTitle}>Invite People</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={18} color={NeutralColors.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={NeutralColors.gray300}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={BrandColors.primary} />}
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderUserResult}
        keyExtractor={userKeyExtractor}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          searchQuery.length >= 2 && !searching ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Search for users to invite</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: NeutralColors.gray900,
  },
  listContent: {
    flexGrow: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: NeutralColors.white,
  },
  userAvatar: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NeutralColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  userEmail: {
    fontSize: 13,
    color: NeutralColors.gray400,
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: NeutralColors.white,
  },
  separator: {
    height: 1,
    backgroundColor: NeutralColors.gray100,
    marginLeft: 78,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.gray400,
  },
});
