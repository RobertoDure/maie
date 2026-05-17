import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Spacing } from '@/constants/theme';
import { ConversationWithDetails } from '@/lib/services';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatListItemProps {
  conversation: ConversationWithDetails;
  currentUserId: string;
  onPress: () => void;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(dateStr)
  );
}

export const ChatListItem = memo(function ChatListItem({
  conversation,
  currentUserId,
  onPress,
}: ChatListItemProps) {
  const isGroup = conversation.type === 'group';

  // For direct chats, show the other person's info
  const otherParticipant = !isGroup
    ? conversation.participants.find((p) => p.user_id !== currentUserId)
    : null;

  const displayName = isGroup
    ? conversation.name || 'Group Chat'
    : otherParticipant?.full_name || 'Unknown';

  const avatarUrl = isGroup ? conversation.avatar_url : otherParticipant?.avatar_url;

  const lastMsg = conversation.last_message;
  const lastMessageText = lastMsg
    ? lastMsg.is_deleted
      ? 'Message deleted'
      : lastMsg.message_type === 'image'
        ? '📷 Photo'
        : lastMsg.content
    : 'No messages yet';

  const lastMessageTime = lastMsg?.created_at || conversation.created_at;

  const lastSenderName =
    lastMsg && lastMsg.sender_id !== currentUserId
      ? conversation.participants.find((p) => p.user_id === lastMsg.sender_id)?.full_name
      : null;

  const hasUnread = conversation.unread_count > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <IconSymbol
              name={isGroup ? 'person.2.fill' : 'person.fill'}
              size={22}
              color={NeutralColors.gray300}
            />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.time, hasUnread && styles.timeBold]}>
            {getRelativeTime(lastMessageTime)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.message, hasUnread && styles.messageBold]} numberOfLines={1}>
            {isGroup && lastSenderName ? `${lastSenderName}: ` : ''}
            {lastMessageText}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: NeutralColors.white,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: NeutralColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: NeutralColors.gray900,
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: NeutralColors.gray400,
  },
  timeBold: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: NeutralColors.gray400,
    flex: 1,
    marginRight: Spacing.sm,
  },
  messageBold: {
    color: NeutralColors.gray900,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: BrandColors.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: NeutralColors.white,
  },
});
