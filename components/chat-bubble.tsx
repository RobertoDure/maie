import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Spacing } from '@/constants/theme';
import { MessageWithSender } from '@/lib/services';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatBubbleProps {
  message: MessageWithSender;
  isMine: boolean;
  showSender?: boolean;
  onLongPress?: (messageId: string) => void;
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export const ChatBubble = memo(function ChatBubble({
  message,
  isMine,
  showSender = true,
  onLongPress,
}: ChatBubbleProps) {
  if (message.message_type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  const senderName = message.sender?.full_name || 'Unknown';
  const isDeleted = message.is_deleted;
  const time = timeFormatter.format(new Date(message.created_at));

  return (
    <View style={[styles.container, isMine ? styles.containerRight : styles.containerLeft]}>
      {/* Sender avatar (only for others) */}
      {!isMine && showSender && (
        <View style={styles.avatarCol}>
          {message.sender?.avatar_url ? (
            <Image source={{ uri: message.sender.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <IconSymbol name="person.fill" size={12} color={NeutralColors.gray300} />
            </View>
          )}
        </View>
      )}

      <Pressable
        onLongPress={() => onLongPress?.(message.id)}
        style={({ pressed }) => [
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          pressed && { opacity: 0.85 },
        ]}
      >
        {/* Sender name for group chats */}
        {!isMine && showSender && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}

        {/* Reply preview */}
        {message.reply_to && !message.reply_to.is_deleted && (
          <View style={styles.replyPreview}>
            <View style={styles.replyBar} />
            <Text style={styles.replyText} numberOfLines={1}>
              {message.reply_to.content}
            </Text>
          </View>
        )}

        {/* Image attachment */}
        {message.message_type === 'image' && message.attachment_url && (
          <Image
            source={{ uri: message.attachment_url }}
            style={styles.attachmentImage}
            contentFit="cover"
            transition={200}
          />
        )}

        {/* Message text */}
        <Text
          style={[
            styles.messageText,
            isMine ? styles.messageTextMine : styles.messageTextTheirs,
            isDeleted && styles.deletedText,
          ]}
        >
          {isDeleted ? 'This message was deleted' : message.content}
        </Text>

        {/* Time + edited indicator */}
        <View style={styles.metaRow}>
          {message.edited_at && <Text style={styles.editedText}>edited</Text>}
          <Text style={[styles.timeText, isMine ? styles.timeTextMine : styles.timeTextTheirs]}>
            {time}
          </Text>
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  containerLeft: {
    justifyContent: 'flex-start',
  },
  containerRight: {
    justifyContent: 'flex-end',
  },
  avatarCol: {
    marginRight: Spacing.sm,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NeutralColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  bubbleMine: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: NeutralColors.gray100,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.accent,
    marginBottom: 2,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingVertical: 2,
  },
  replyBar: {
    width: 2,
    height: '100%',
    minHeight: 16,
    backgroundColor: BrandColors.accent,
    borderRadius: 1,
    marginRight: Spacing.xs,
  },
  replyText: {
    fontSize: 12,
    color: NeutralColors.gray400,
    flex: 1,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMine: {
    color: NeutralColors.white,
  },
  messageTextTheirs: {
    color: NeutralColors.gray900,
  },
  deletedText: {
    fontStyle: 'italic',
    color: NeutralColors.gray400,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  editedText: {
    fontSize: 10,
    color: NeutralColors.gray300,
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: 10,
  },
  timeTextMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextTheirs: {
    color: NeutralColors.gray400,
  },
  systemContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  systemText: {
    fontSize: 12,
    color: NeutralColors.gray400,
    fontStyle: 'italic',
  },
});
