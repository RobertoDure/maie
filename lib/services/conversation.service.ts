import { Database } from '../database.types';
import { supabase } from '../supabase';
import { AuditService } from './audit.service';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type ConversationInvite = Database['public']['Tables']['conversation_invites']['Row'];

export interface ConversationWithDetails extends Conversation {
  participants: Array<{
    user_id: string;
    role: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  last_message: Message | null;
  unread_count: number;
}

export class ConversationService {
  static async getConversations(userId: string): Promise<ConversationWithDetails[]> {
    try {
      // Get conversations the user participates in
      const { data: participations, error: pError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (pError) throw pError;
      if (!participations || participations.length === 0) return [];

      const conversationIds = participations.map((p) => p.conversation_id);

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!conversations || conversations.length === 0) return [];

      // Get all participants for these conversations
      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, role')
        .in('conversation_id', conversationIds);

      const participantUserIds = [
        ...new Set((allParticipants || []).map((p) => p.user_id)),
      ];

      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', participantUserIds);

      const usersMap = new Map(
        (users || []).map((u) => [u.id, u])
      );

      // Get last message per conversation
      const lastMessages = new Map<string, Message>();
      for (const convId of conversationIds) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (msgs && msgs.length > 0) {
          lastMessages.set(convId, msgs[0]);
        }
      }

      // Get read receipts for unread count
      const { data: receipts } = await supabase
        .from('message_read_receipts')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId)
        .in('conversation_id', conversationIds);

      const receiptsMap = new Map(
        (receipts || []).map((r) => [r.conversation_id, r.last_read_at])
      );

      // Count unread messages
      const unreadCounts = new Map<string, number>();
      for (const convId of conversationIds) {
        const lastReadAt = receiptsMap.get(convId);
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('is_deleted', false)
          .neq('sender_id', userId);

        if (lastReadAt) {
          query = query.gt('created_at', lastReadAt);
        }

        const { count } = await query;
        unreadCounts.set(convId, count || 0);
      }

      return conversations.map((conv) => {
        const convParticipants = (allParticipants || [])
          .filter((p) => p.conversation_id === conv.id)
          .map((p) => {
            const user = usersMap.get(p.user_id);
            return {
              user_id: p.user_id,
              role: p.role || 'member',
              full_name: user?.full_name || null,
              avatar_url: user?.avatar_url || null,
            };
          });

        return {
          ...conv,
          participants: convParticipants,
          last_message: lastMessages.get(conv.id) || null,
          unread_count: unreadCounts.get(conv.id) || 0,
        };
      }).sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  static async createDirectChat(
    userId: string,
    targetUserId: string
  ): Promise<Conversation> {
    try {
      // Check if direct chat already exists between these two users
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (myConvs && myConvs.length > 0) {
        const myConvIds = myConvs.map((c) => c.conversation_id);

        const { data: theirConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', myConvIds);

        if (theirConvs && theirConvs.length > 0) {
          const sharedConvIds = theirConvs.map((c) => c.conversation_id);
          const { data: directConv } = await supabase
            .from('conversations')
            .select('*')
            .in('id', sharedConvIds)
            .eq('type', 'direct')
            .maybeSingle();

          if (directConv) return directConv;
        }
      }

      // Create new direct conversation
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({ type: 'direct' as const, created_by: userId })
        .select()
        .single();

      if (error) throw error;

      // Add both participants
      await supabase.from('conversation_participants').insert([
        { conversation_id: conv.id, user_id: userId, role: 'admin' as const },
        { conversation_id: conv.id, user_id: targetUserId, role: 'member' as const },
      ]);

      await AuditService.log(userId, 'CREATE', 'conversation', conv.id);
      return conv;
    } catch (error) {
      console.error('Error creating direct chat:', error);
      throw error;
    }
  }

  static async createGroupChat(
    userId: string,
    name: string,
    participantIds: string[]
  ): Promise<Conversation> {
    try {
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({
          type: 'group' as const,
          name,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      const allParticipants = [userId, ...participantIds.filter((id) => id !== userId)];
      const inserts = allParticipants.map((id) => ({
        conversation_id: conv.id,
        user_id: id,
        role: (id === userId ? 'admin' : 'member') as 'admin' | 'member',
      }));

      await supabase.from('conversation_participants').insert(inserts);

      await AuditService.log(userId, 'CREATE', 'group_conversation', conv.id);
      return conv;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  }

  static async inviteUser(
    conversationId: string,
    invitedBy: string,
    invitedUserId: string
  ): Promise<ConversationInvite> {
    try {
      const { data, error } = await supabase
        .from('conversation_invites')
        .insert({
          conversation_id: conversationId,
          invited_by: invitedBy,
          invited_user_id: invitedUserId,
          status: 'pending' as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  static async respondToInvite(
    inviteId: string,
    userId: string,
    accept: boolean
  ): Promise<void> {
    try {
      const { data: invite, error: fetchError } = await supabase
        .from('conversation_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('invited_user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const newStatus = accept ? 'accepted' : 'declined';

      await supabase
        .from('conversation_invites')
        .update({ status: newStatus as 'accepted' | 'declined' })
        .eq('id', inviteId);

      if (accept) {
        await supabase.from('conversation_participants').insert({
          conversation_id: invite.conversation_id,
          user_id: userId,
          role: 'member' as const,
        });
      }
    } catch (error) {
      console.error('Error responding to invite:', error);
      throw error;
    }
  }

  static async leaveConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      await AuditService.log(userId, 'LEAVE', 'conversation', conversationId);
    } catch (error) {
      console.error('Error leaving conversation:', error);
      throw error;
    }
  }

  static async getPendingInvites(userId: string): Promise<ConversationInvite[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_invites')
        .select('*')
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending invites:', error);
      throw error;
    }
  }

  static async searchUsers(query: string, currentUserId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, email')
        .neq('id', currentUserId)
        .eq('is_active', true)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}
