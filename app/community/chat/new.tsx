import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ConversationService } from '@/lib/services';
import { isUuid } from '@/lib/uuid';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
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

type ChatMode = 'direct' | 'group';

export default function NewChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<ChatMode>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

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

  const toggleUser = useCallback((userResult: UserResult) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === userResult.id);
      if (exists) return prev.filter((u) => u.id !== userResult.id);
      return [...prev, userResult];
    });
  }, []);

  const handleCreateDirect = useCallback(
    async (targetUser: UserResult) => {
      if (!user) return;
      setCreating(true);
      try {
        const conv = await ConversationService.createDirectChat(user.id, targetUser.id);
        if (!isUuid(conv.id)) {
          throw new Error('The chat was created without a valid ID. Please try again.');
        }
        router.replace(`/community/chat/${conv.id}`);
      } catch (error: any) {
        Alert.alert('Error', error.message);
        setCreating(false);
      }
    },
    [user, router]
  );

  const handleCreateGroup = useCallback(async () => {
    if (!user || selectedUsers.length === 0) return;
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      const participantIds = selectedUsers.map((u) => u.id);
      const conv = await ConversationService.createGroupChat(
        user.id,
        groupName.trim(),
        participantIds
      );
      if (!isUuid(conv.id)) {
        throw new Error('The chat was created without a valid ID. Please try again.');
      }
      router.replace(`/community/chat/${conv.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setCreating(false);
    }
  }, [user, selectedUsers, groupName, router]);

  const renderUserResult = useCallback(
    ({ item }: { item: UserResult }) => {
      const isSelected = selectedUsers.some((u) => u.id === item.id);

      return (
        <Pressable
          style={({ pressed }) => [styles.userRow, pressed && { opacity: 0.7 }]}
          onPress={() => {
            if (mode === 'direct') {
              handleCreateDirect(item);
            } else {
              toggleUser(item);
            }
          }}
        >
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
          {mode === 'group' && (
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && (
                <IconSymbol name="checkmark" size={14} color={NeutralColors.white} />
              )}
            </View>
          )}
        </Pressable>
      );
    },
    [mode, selectedUsers, handleCreateDirect, toggleUser]
  );

  const userKeyExtractor = useCallback((item: UserResult) => item.id, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol name="chevron.left" size={24} color={NeutralColors.gray900} />
        </Pressable>
        <Text style={styles.headerTitle}>New Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Mode toggle */}
      <View style={styles.modeContainer}>
        <Pressable
          onPress={() => {
            setMode('direct');
            setSelectedUsers([]);
          }}
          style={[styles.modeButton, mode === 'direct' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeText, mode === 'direct' && styles.modeTextActive]}>
            Direct Message
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('group')}
          style={[styles.modeButton, mode === 'group' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeText, mode === 'group' && styles.modeTextActive]}>
            Group Chat
          </Text>
        </Pressable>
      </View>

      {/* Group name input */}
      {mode === 'group' && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Group name"
            placeholderTextColor={NeutralColors.gray300}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
        </View>
      )}

      {/* Selected users chips */}
      {mode === 'group' && selectedUsers.length > 0 && (
        <View style={styles.chipsContainer}>
          {selectedUsers.map((u) => (
            <Pressable
              key={u.id}
              style={styles.chip}
              onPress={() => toggleUser(u)}
            >
              <Text style={styles.chipText}>{u.full_name || u.email}</Text>
              <IconSymbol name="xmark" size={12} color={BrandColors.primary} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Search input */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={18} color={NeutralColors.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          placeholderTextColor={NeutralColors.gray300}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={BrandColors.primary} />}
      </View>

      {/* Results */}
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
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Create group button */}
      {mode === 'group' && selectedUsers.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Pressable
            onPress={handleCreateGroup}
            disabled={creating}
            style={({ pressed }) => [
              styles.createButton,
              creating && { opacity: 0.6 },
              pressed && { opacity: 0.8 },
            ]}
          >
            {creating ? (
              <ActivityIndicator size="small" color={NeutralColors.white} />
            ) : (
              <Text style={styles.createButtonText}>
                Create Group ({selectedUsers.length} {selectedUsers.length === 1 ? 'member' : 'members'})
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {creating && mode === 'direct' && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      )}
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
  modeContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: NeutralColors.gray100,
    borderRadius: Radius.sm,
    padding: 3,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm - 2,
  },
  modeButtonActive: {
    backgroundColor: NeutralColors.white,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '500',
    color: NeutralColors.gray400,
  },
  modeTextActive: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  groupNameContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  groupNameInput: {
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: NeutralColors.gray900,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primaryLight + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: 13,
    color: BrandColors.primary,
    fontWeight: '500',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: NeutralColors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
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
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: NeutralColors.white,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.gray100,
  },
  createButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.white,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
