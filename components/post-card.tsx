import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Shadows, Spacing } from '@/constants/theme';
import { PostWithAuthor } from '@/lib/services';
import { Image } from 'expo-image';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  heart: '❤️',
  hug: '🤗',
  strength: '💪',
};

interface PostCardProps {
  post: PostWithAuthor;
  currentUserId: string;
  onPress?: () => void;
  onReaction?: (postId: string, type: string) => void;
  onDelete?: (postId: string) => void;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(dateStr)
  );
}

export const PostCard = memo(function PostCard({
  post,
  currentUserId,
  onPress,
  onReaction,
  onDelete,
}: PostCardProps) {
  const isOwn = post.author_id === currentUserId;
  const authorName = post.author?.full_name || 'Anonymous';
  const avatarUri = post.author?.avatar_url;
  const totalReactions = Object.values(post.reaction_counts).reduce((a, b) => a + b, 0);

  const handleReaction = useCallback(
    (type: string) => onReaction?.(post.id, type),
    [post.id, onReaction]
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}
      onPress={onPress}
    >
      {/* Author header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <IconSymbol name="person.fill" size={18} color={NeutralColors.gray300} />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.timeText}>{getRelativeTime(post.created_at)}</Text>
        </View>
        {post.is_pinned && (
          <View style={styles.pinnedBadge}>
            <IconSymbol name="pin.fill" size={12} color={BrandColors.accent} />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}
        {isOwn && onDelete && (
          <Pressable
            onPress={() => onDelete(post.id)}
            hitSlop={12}
            style={({ pressed }) => [styles.moreButton, pressed && { opacity: 0.5 }]}
          >
            <IconSymbol name="trash" size={16} color={NeutralColors.gray400} />
          </Pressable>
        )}
      </View>

      {/* Post content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Image attachment */}
      {post.image_url ? (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* Milestone badge */}
      {post.post_type === 'milestone' && (
        <View style={styles.milestoneBadge}>
          <IconSymbol name="star.fill" size={14} color="#FFD700" />
          <Text style={styles.milestoneText}>Milestone</Text>
        </View>
      )}

      {/* Reactions + comments bar */}
      <View style={styles.statsBar}>
        {totalReactions > 0 && (
          <Text style={styles.statsText}>
            {Object.entries(post.reaction_counts)
              .filter(([, count]) => count > 0)
              .map(([type]) => REACTION_EMOJIS[type])
              .join(' ')}{' '}
            {totalReactions}
          </Text>
        )}
        {post.comment_count > 0 && (
          <Text style={styles.statsText}>
            {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
          </Text>
        )}
      </View>

      {/* Reaction buttons */}
      <View style={styles.reactionBar}>
        {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => {
          const isActive = post.user_reactions.includes(type);
          return (
            <Pressable
              key={type}
              onPress={() => handleReaction(type)}
              style={({ pressed }) => [
                styles.reactionButton,
                isActive && styles.reactionButtonActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.commentButton, pressed && { opacity: 0.7 }]}
        >
          <IconSymbol name="bubble.left" size={16} color={NeutralColors.gray400} />
          <Text style={styles.commentButtonText}>Comment</Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NeutralColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  timeText: {
    fontSize: 12,
    color: NeutralColors.gray400,
    marginTop: 2,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.accentLight + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginRight: Spacing.sm,
  },
  pinnedText: {
    fontSize: 11,
    color: BrandColors.accentDark,
    marginLeft: 3,
    fontWeight: '500',
  },
  moreButton: {
    padding: Spacing.xs,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: NeutralColors.gray900,
    marginBottom: Spacing.md,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
    marginBottom: Spacing.sm,
  },
  statsText: {
    fontSize: 13,
    color: NeutralColors.gray400,
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reactionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
  },
  reactionButtonActive: {
    backgroundColor: BrandColors.primaryLight + '20',
    borderColor: BrandColors.primary,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  commentButtonText: {
    fontSize: 13,
    color: NeutralColors.gray400,
    fontWeight: '500',
  },
});
