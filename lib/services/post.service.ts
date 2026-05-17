import { File } from 'expo-file-system';
import { Database } from '../database.types';
import { supabase } from '../supabase';
import { AuditService } from './audit.service';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostReaction = Database['public']['Tables']['post_reactions']['Row'];
type PostComment = Database['public']['Tables']['post_comments']['Row'];
type PostCommentInsert = Database['public']['Tables']['post_comments']['Insert'];

export interface PostWithAuthor extends Post {
  author: { full_name: string | null; avatar_url: string | null } | null;
  reaction_counts: Record<string, number>;
  user_reactions: string[];
  comment_count: number;
}

export interface CommentWithAuthor extends PostComment {
  author: { full_name: string | null; avatar_url: string | null } | null;
}

export class PostService {
  static async getFeed(
    userId: string,
    page: number = 0,
    limit: number = 20
  ): Promise<PostWithAuthor[]> {
    try {
      const from = page * limit;
      const to = from + limit - 1;

      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const authorIds = [...new Set(posts.map((p) => p.author_id))];
      const postIds = posts.map((p) => p.id);

      const [authorsResult, reactionsResult, userReactionsResult, commentsResult] =
        await Promise.all([
          supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', authorIds),
          supabase
            .from('post_reactions')
            .select('post_id, reaction_type')
            .in('post_id', postIds),
          supabase
            .from('post_reactions')
            .select('post_id, reaction_type')
            .in('post_id', postIds)
            .eq('user_id', userId),
          supabase
            .from('post_comments')
            .select('post_id')
            .in('post_id', postIds),
        ]);

      const authorsMap = new Map(
        (authorsResult.data || []).map((a) => [a.id, a])
      );

      const reactionCounts = new Map<string, Record<string, number>>();
      for (const r of reactionsResult.data || []) {
        const counts = reactionCounts.get(r.post_id) || {};
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        reactionCounts.set(r.post_id, counts);
      }

      const userReactionsMap = new Map<string, string[]>();
      for (const r of userReactionsResult.data || []) {
        const reactions = userReactionsMap.get(r.post_id) || [];
        reactions.push(r.reaction_type);
        userReactionsMap.set(r.post_id, reactions);
      }

      const commentCounts = new Map<string, number>();
      for (const c of commentsResult.data || []) {
        commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1);
      }

      return posts.map((post) => ({
        ...post,
        author: authorsMap.get(post.author_id) || null,
        reaction_counts: reactionCounts.get(post.id) || {},
        user_reactions: userReactionsMap.get(post.id) || [],
        comment_count: commentCounts.get(post.id) || 0,
      }));
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  }

  static async uploadPostImage(userId: string, imageUri: string): Promise<string> {
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const file = new File(imageUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  static async createPost(
    userId: string,
    content: string,
    imageUrl?: string | null,
    postType: Post['post_type'] = 'text'
  ): Promise<Post> {
    try {
      const insert: PostInsert = {
        author_id: userId,
        content,
        image_url: imageUrl,
        post_type: postType,
      };

      const { data, error } = await supabase
        .from('posts')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CREATE', 'post', data.id);
      return data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async deletePost(userId: string, postId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', userId);

      if (error) throw error;

      await AuditService.log(userId, 'DELETE', 'post', postId);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  static async toggleReaction(
    userId: string,
    postId: string,
    reactionType: PostReaction['reaction_type']
  ): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('post_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existing) {
        await supabase.from('post_reactions').delete().eq('id', existing.id);
        return false;
      }

      await supabase.from('post_reactions').insert({
        post_id: postId,
        user_id: userId,
        reaction_type: reactionType,
      });
      return true;
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  }

  static async getComments(
    postId: string,
    page: number = 0,
    limit: number = 30
  ): Promise<CommentWithAuthor[]> {
    try {
      const from = page * limit;
      const to = from + limit - 1;

      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      const authorIds = [...new Set(comments.map((c) => c.author_id))];
      const { data: authors } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const authorsMap = new Map(
        (authors || []).map((a) => [a.id, a])
      );

      return comments.map((comment) => ({
        ...comment,
        author: authorsMap.get(comment.author_id) || null,
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  static async addComment(
    userId: string,
    postId: string,
    content: string,
    parentCommentId?: string
  ): Promise<PostComment> {
    try {
      const insert: PostCommentInsert = {
        post_id: postId,
        author_id: userId,
        content,
        parent_comment_id: parentCommentId,
      };

      const { data, error } = await supabase
        .from('post_comments')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CREATE', 'post_comment', data.id);
      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  static async deleteComment(userId: string, commentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
}
