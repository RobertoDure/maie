import { RealtimeChannel } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { supabase } from '../supabase';
import { assertUuid } from '../uuid';

type Message = Database['public']['Tables']['messages']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];

export class RealtimeService {
  private static channels = new Map<string, RealtimeChannel>();

  static subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ): RealtimeChannel {
    assertUuid(conversationId, 'conversation ID');

    const channelName = `chat:${conversationId}`;

    // Unsubscribe if already exists
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  static subscribeToFeed(onNewPost: (post: Post) => void): RealtimeChannel {
    const channelName = 'feed:global';

    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          onNewPost(payload.new as Post);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  static sendTypingIndicator(
    conversationId: string,
    userId: string,
    isTyping: boolean
  ): void {
    assertUuid(conversationId, 'conversation ID');
    assertUuid(userId, 'user ID');

    const channelName = `chat:${conversationId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: userId, is_typing: isTyping },
      });
    }
  }

  static subscribeToTyping(
    conversationId: string,
    onTyping: (userId: string, isTyping: boolean) => void
  ): void {
    assertUuid(conversationId, 'conversation ID');

    const channelName = `chat:${conversationId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      channel.on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as { user_id: string; is_typing: boolean };
        onTyping(data.user_id, data.is_typing);
      });
    }
  }

  static subscribeToPresence(
    conversationId: string,
    userId: string,
    onPresenceChange: (online: string[]) => void
  ): void {
    assertUuid(conversationId, 'conversation ID');
    assertUuid(userId, 'user ID');

    const channelName = `chat:${conversationId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const onlineUsers = Object.values(state)
            .flat()
            .map((p: any) => p.user_id as string);
          onPresenceChange(onlineUsers);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: userId });
          }
        });
    }
  }

  static subscribeToInvites(
    userId: string,
    onInvite: (invite: any) => void
  ): RealtimeChannel {
    assertUuid(userId, 'user ID');

    const channelName = `invites:${userId}`;

    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_invites',
          filter: `invited_user_id=eq.${userId}`,
        },
        (payload) => {
          onInvite(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  static unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  static unsubscribeAll(): void {
    for (const [name] of this.channels) {
      this.unsubscribe(name);
    }
  }
}
