import { ChatBubble } from '@/components/chat-bubble';
import { TypingIndicator } from '@/components/typing-indicator';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
    ConversationService,
    MessageService,
    MessageWithSender,
    RealtimeService,
} from '@/lib/services';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [conversationName, setConversationName] = useState('Chat');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());

  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversation info + messages
  useEffect(() => {
    if (!user || !conversationId) return;

    const load = async () => {
      try {
        const [msgs, convs] = await Promise.all([
          MessageService.getMessages(conversationId),
          ConversationService.getConversations(user.id),
        ]);

        setMessages(msgs);

        const conv = convs.find((c) => c.id === conversationId);
        if (conv) {
          if (conv.type === 'direct') {
            const other = conv.participants.find((p) => p.user_id !== user.id);
            setConversationName(other?.full_name || 'Chat');
          } else {
            setConversationName(conv.name || 'Group Chat');
          }

          const nameMap = new Map<string, string>();
          for (const p of conv.participants) {
            nameMap.set(p.user_id, p.full_name || 'Unknown');
          }
          setParticipantNames(nameMap);
        }

        // Mark messages as read
        if (msgs.length > 0) {
          await MessageService.markAsRead(conversationId, user.id, msgs[0].id);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, conversationId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    RealtimeService.subscribeToConversation(conversationId, async (newMsg) => {
      // Fetch full message with sender info
      const msgs = await MessageService.getMessages(conversationId, undefined, 1);
      if (msgs.length > 0) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgs[0].id)) return prev;
          return [msgs[0], ...prev];
        });

        // Mark as read if from someone else
        if (msgs[0].sender_id !== user.id) {
          await MessageService.markAsRead(conversationId, user.id, msgs[0].id);
        }
      }
    });

    // Subscribe to typing
    RealtimeService.subscribeToTyping(conversationId, (userId, isTyping) => {
      if (userId === user.id) return;
      setTypingUsers((prev) => {
        if (isTyping) return prev.includes(userId) ? prev : [...prev, userId];
        return prev.filter((id) => id !== userId);
      });
    });

    return () => {
      RealtimeService.unsubscribe(`chat:${conversationId}`);
    };
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!user || !conversationId || !inputText.trim()) return;
    setSending(true);

    try {
      const content = inputText.trim();
      setInputText('');
      await MessageService.sendMessage(conversationId, user.id, content);
      // Stop typing indicator
      RealtimeService.sendTypingIndicator(conversationId, user.id, false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!user || !conversationId) return;

    // Send typing indicator
    RealtimeService.sendTypingIndicator(conversationId, user.id, true);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      RealtimeService.sendTypingIndicator(conversationId, user.id, false);
    }, 2000);
  };

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!user) return;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.sender_id !== user.id) return;

      Alert.alert('Delete Message', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MessageService.deleteMessage(user.id, messageId);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? { ...m, is_deleted: true, content: 'This message was deleted' }
                    : m
                )
              );
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]);
    },
    [user, messages]
  );

  const loadMore = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    try {
      const older = await MessageService.getMessages(conversationId, lastMsg.created_at);
      if (older.length > 0) {
        setMessages((prev) => [...prev, ...older]);
      }
    } catch {
      // Silently fail on pagination
    }
  }, [conversationId, messages]);

  const renderMessage = useCallback(
    ({ item }: { item: MessageWithSender }) => (
      <ChatBubble
        message={item}
        isMine={item.sender_id === user?.id}
        showSender={true}
        onLongPress={handleDeleteMessage}
      />
    ),
    [user?.id, handleDeleteMessage]
  );

  const messageKeyExtractor = useCallback((item: MessageWithSender) => item.id, []);

  const typingNames = typingUsers
    .map((id) => participantNames.get(id) || 'Someone')
    .filter(Boolean);

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversationName}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/community/chat/invite', params: { conversationId } })
          }
          hitSlop={12}
        >
          <IconSymbol name="person.badge.plus" size={22} color={BrandColors.primary} />
        </Pressable>
      </View>

      {/* Messages - inverted FlatList (newest at bottom) */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={messageKeyExtractor}
        inverted
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          typingNames.length > 0 ? <TypingIndicator names={typingNames} /> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="bubble.left" size={48} color={NeutralColors.gray300} />
            <Text style={styles.emptyText}>No messages yet{'\n'}Say hello!</Text>
          </View>
        }
        contentContainerStyle={styles.messagesList}
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={NeutralColors.gray300}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={4000}
          editable={!sending}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={({ pressed }) => [
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
            pressed && { opacity: 0.7 },
          ]}
        >
          {sending ? (
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.gray400,
    textAlign: 'center',
    marginTop: Spacing.md,
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
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
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
