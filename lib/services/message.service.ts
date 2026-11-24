import { Database } from '../database.types';
import { supabase } from '../supabase';
import { assertUuid, isUuid } from '../uuid';

type Message = Database['public']['Tables']['messages']['Row'];

export type MessageWithSender = Omit<Message, 'reply_to_id'> & {
  sender: { full_name: string | null; avatar_url: string | null } | null;
  reply_to: { id: string; content: string; is_deleted: boolean } | null;
};

export class MessageService {
  static async getMessages(
    conversationId: string,
    before?: string,
    limit = 50
  ): Promise<MessageWithSender[]> {
    assertUuid(conversationId, 'conversation ID');

    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;
    if (!messages?.length) return [];

    // Guard against null/undefined ids coming back from the API. Passing an
    // undefined value to `.in()` makes PostgREST send the literal string
    // "undefined", which Postgres rejects with:
    //   invalid input syntax for type uuid: "undefined"
    const senderIds = [
      ...new Set(messages.map((message) => message.sender_id).filter(isUuid)),
    ];
    const replyIds = [
      ...new Set(messages.map((message) => message.reply_to_id).filter(isUuid)),
    ];

    const [usersResult, repliesResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', senderIds),
      replyIds.length
        ? supabase
            .from('messages')
            .select('id, content, is_deleted')
            .in('id', replyIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (repliesResult.error) throw repliesResult.error;

    const users = new Map(usersResult.data.map((user) => [user.id, user]));
    const replies = new Map(repliesResult.data.map((message) => [message.id, message]));

    return messages.map(({ reply_to_id, ...message }) => ({
      ...message,
      sender: users.get(message.sender_id) ?? null,
      reply_to: reply_to_id ? replies.get(reply_to_id) ?? null : null,
    }));
  }

  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<Message> {
    assertUuid(conversationId, 'conversation ID');
    assertUuid(senderId, 'sender ID');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: 'text',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async markAsRead(
    conversationId: string,
    userId: string,
    messageId: string
  ): Promise<void> {
    assertUuid(conversationId, 'conversation ID');
    assertUuid(userId, 'user ID');
    assertUuid(messageId, 'message ID');

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError) throw messageError;

    const { error } = await supabase.from('message_read_receipts').upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: message.created_at,
      },
      { onConflict: 'conversation_id,user_id' }
    );

    if (error) throw error;
  }

  static async deleteMessage(userId: string, messageId: string): Promise<void> {
    assertUuid(userId, 'user ID');
    assertUuid(messageId, 'message ID');

    const { data, error } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: 'This message was deleted' })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('Message not found or you do not have permission to delete it.');
    }
  }
}
