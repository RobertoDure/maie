import { PostCard } from '@/components/post-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { CommentWithAuthor, PostService, PostWithAuthor } from '@/lib/services';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPost = useCallback(async () => {
    if (!user || !id) return;
    try {
      const posts = await PostService.getFeed(user.id, 0, 50);
      const found = posts.find((p) => p.id === id);
      setPost(found || null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }, [user, id]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      const data = await PostService.getComments(id);
      setComments(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [loadPost, loadComments]);

  const handleSubmitComment = async () => {
    if (!user || !id || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await PostService.addComment(user.id, id, commentText.trim());
      setCommentText('');
      await loadComments();
      // Refresh post to update comment count
      await loadPost();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return;
      Alert.alert('Delete Comment', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PostService.deleteComment(user.id, commentId);
              setComments((prev) => prev.filter((c) => c.id !== commentId));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]);
    },
    [user]
  );

  const getRelativeTime = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderComment = useCallback(
    ({ item }: { item: CommentWithAuthor }) => {
      const isOwn = item.author_id === user?.id;
      return (
        <View style={commentStyles.container}>
          <View style={commentStyles.avatarCol}>
            {item.author?.avatar_url ? (
              <Image source={{ uri: item.author.avatar_url }} style={commentStyles.avatar} />
            ) : (
              <View style={commentStyles.avatarFallback}>
                <IconSymbol name="person.fill" size={12} color={NeutralColors.gray300} />
              </View>
            )}
          </View>
          <View style={commentStyles.bubble}>
            <View style={commentStyles.header}>
              <Text style={commentStyles.authorName}>
                {item.author?.full_name || 'Anonymous'}
              </Text>
              <Text style={commentStyles.time}>{getRelativeTime(item.created_at)}</Text>
            </View>
            <Text style={commentStyles.content}>{item.content}</Text>
          </View>
          {isOwn && (
            <Pressable
              onPress={() => handleDeleteComment(item.id)}
              hitSlop={8}
              style={({ pressed }) => [commentStyles.deleteBtn, pressed && { opacity: 0.5 }]}
            >
              <IconSymbol name="trash" size={14} color={NeutralColors.gray400} />
            </Pressable>
          )}
        </View>
      );
    },
    [user?.id, handleDeleteComment]
  );

  const commentKeyExtractor = useCallback((item: CommentWithAuthor) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={BrandColors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol name="chevron.left" size={24} color={NeutralColors.gray900} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={commentKeyExtractor}
        ListHeaderComponent={
          post ? (
            <PostCard
              post={post}
              currentUserId={user?.id || ''}
              onReaction={async (postId, type) => {
                if (!user) return;
                await PostService.toggleReaction(user.id, postId, type as any);
                await loadPost();
              }}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyComments}>
            <Text style={styles.emptyText}>No comments yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Comment input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          placeholderTextColor={NeutralColors.gray300}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={1000}
          editable={!submitting}
        />
        <Pressable
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submitting}
          style={({ pressed }) => [
            styles.sendButton,
            (!commentText.trim() || submitting) && styles.sendButtonDisabled,
            pressed && { opacity: 0.7 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={NeutralColors.white} />
          ) : (
            <IconSymbol name="arrow.up" size={18} color={NeutralColors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  listContent: {
    flexGrow: 1,
    paddingBottom: Spacing.md,
  },
  emptyComments: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.gray400,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: NeutralColors.white,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.gray100,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: NeutralColors.gray50,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: NeutralColors.gray900,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: NeutralColors.gray200,
  },
});

const commentStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  avatarCol: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NeutralColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flex: 1,
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  time: {
    fontSize: 11,
    color: NeutralColors.gray400,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: NeutralColors.gray500,
  },
  deleteBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
