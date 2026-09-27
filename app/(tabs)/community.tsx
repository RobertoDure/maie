import { ChatListItem } from '@/components/chat-list-item';
import { PostCard } from '@/components/post-card';
import { PostComposer } from '@/components/post-composer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
    ConversationService,
    ConversationWithDetails,
    PostService,
    PostWithAuthor,
    RealtimeService,
} from '@/lib/services';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Segment = 'feed' | 'chats';

export default function CommunityScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [segment, setSegment] = useState<Segment>('feed');

  // Feed state
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const feedPage = useRef(0);

  // Chat state
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsRefreshing, setChatsRefreshing] = useState(false);

  // Load feed
  const loadFeed = useCallback(
    async (page: number = 0, refresh: boolean = false) => {
      if (!user) return;
      try {
        const data = await PostService.getFeed(user.id, page);
        if (refresh || page === 0) {
          setPosts(data);
        } else {
          setPosts((prev) => [...prev, ...data]);
        }
        feedPage.current = page;
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setFeedLoading(false);
        setFeedRefreshing(false);
      }
    },
    [user]
  );

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await ConversationService.getConversations(user.id);
      setConversations(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setChatsLoading(false);
      setChatsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadFeed(0, true);
    loadConversations();
  }, [loadFeed, loadConversations]);

  // Realtime feed subscription
  useEffect(() => {
    if (!user) return;

    RealtimeService.subscribeToFeed(async (newPost) => {
      // Reload the feed to get full post data with author info
      const freshPosts = await PostService.getFeed(user.id, 0);
      setPosts(freshPosts);
    });

    return () => {
      RealtimeService.unsubscribe('feed:global');
    };
  }, [user]);

  const handleCreatePost = useCallback(
    async (content: string, imageUri?: string) => {
      if (!user) return;
      let imageUrl: string | undefined;
      if (imageUri) {
        imageUrl = await PostService.uploadPostImage(user.id, imageUri);
      }
      await PostService.createPost(user.id, content, imageUrl);
      await loadFeed(0, true);
    },
    [user, loadFeed]
  );

  const handleReaction = useCallback(
    async (postId: string, type: string) => {
      if (!user) return;
      try {
        await PostService.toggleReaction(user.id, postId, type as any);
        // Optimistically refresh
        const freshPosts = await PostService.getFeed(user.id, 0);
        setPosts(freshPosts);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    },
    [user]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!user) return;
      Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PostService.deletePost(user.id, postId);
              setPosts((prev) => prev.filter((p) => p.id !== postId));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]);
    },
    [user]
  );

  const renderPost = useCallback(
    ({ item }: { item: PostWithAuthor }) => (
      <PostCard
        post={item}
        currentUserId={user?.id || ''}
        onPress={() => router.push(`/community/post/${item.id}`)}
        onReaction={handleReaction}
        onDelete={handleDeletePost}
      />
    ),
    [user?.id, handleReaction, handleDeletePost, router]
  );

  const renderChat = useCallback(
    ({ item }: { item: ConversationWithDetails }) => (
      <ChatListItem
        conversation={item}
        currentUserId={user?.id || ''}
        onPress={() => router.push(`/community/chat/${item.id}`)}
      />
    ),
    [user?.id, router]
  );

  const feedKeyExtractor = useCallback((item: PostWithAuthor) => item.id, []);
  const chatKeyExtractor = useCallback((item: ConversationWithDetails) => item.id, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => setSegment('feed')}
          style={[styles.segmentButton, segment === 'feed' && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentText, segment === 'feed' && styles.segmentTextActive]}>
            Feed
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSegment('chats');
            if (chatsLoading) loadConversations();
          }}
          style={[styles.segmentButton, segment === 'chats' && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentText, segment === 'chats' && styles.segmentTextActive]}>
            Chats
          </Text>
          {conversations.some((c) => c.unread_count > 0) && (
            <View style={styles.segmentBadge} />
          )}
        </Pressable>
      </View>

      {/* Feed Tab */}
      {segment === 'feed' && (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={feedKeyExtractor}
          ListHeaderComponent={
            <PostComposer onSubmit={handleCreatePost} />
          }
          ListEmptyComponent={
            feedLoading ? (
              <ActivityIndicator size="large" color={BrandColors.primary} style={styles.loader} />
            ) : (
              <View style={styles.emptyContainer}>
                <IconSymbol name="text.bubble" size={48} color={NeutralColors.gray300} />
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubtitle}>Be the first to share something!</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={feedRefreshing}
              onRefresh={() => {
                setFeedRefreshing(true);
                loadFeed(0, true);
              }}
              tintColor={BrandColors.primary}
            />
          }
          onEndReached={() => loadFeed(feedPage.current + 1)}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Chats Tab */}
      {segment === 'chats' && (
        <>
          <FlatList
            data={conversations}
            renderItem={renderChat}
            keyExtractor={chatKeyExtractor}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              chatsLoading ? (
                <ActivityIndicator size="large" color={BrandColors.primary} style={styles.loader} />
              ) : (
                <View style={styles.emptyContainer}>
                  <IconSymbol name="bubble.left.and.bubble.right" size={48} color={NeutralColors.gray300} />
                  <Text style={styles.emptyTitle}>No conversations</Text>
                  <Text style={styles.emptySubtitle}>Start a chat with someone!</Text>
                </View>
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={chatsRefreshing}
                onRefresh={() => {
                  setChatsRefreshing(true);
                  loadConversations();
                }}
                tintColor={BrandColors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
          />
          {/* New chat FAB */}
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
            onPress={() => router.push('/community/chat/new')}
          >
            <IconSymbol name="plus" size={24} color={NeutralColors.white} />
          </Pressable>
        </>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: NeutralColors.gray900,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: NeutralColors.gray100,
    borderRadius: Radius.sm,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm - 2,
  },
  segmentButtonActive: {
    backgroundColor: NeutralColors.white,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: NeutralColors.gray400,
  },
  segmentTextActive: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  segmentBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.accent,
    marginLeft: 6,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: NeutralColors.gray100,
    marginLeft: 78,
  },
  loader: {
    marginTop: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: NeutralColors.gray400,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
