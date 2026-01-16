import { Database } from '../database.types';
import { supabase } from '../supabase';
import { AuditService } from './audit.service';

type MoodCheckin = Database['public']['Tables']['mood_checkins']['Row'];
type MoodCheckinInsert = Database['public']['Tables']['mood_checkins']['Insert'];
type SymptomLog = Database['public']['Tables']['symptom_logs']['Row'];
type SymptomLogInsert = Database['public']['Tables']['symptom_logs']['Insert'];

export interface MoodTrend {
  date: string;
  mood_score: number;
  anxiety_level: number;
}

export class MoodService {
  /**
   * Create a mood check-in
   */
  static async createCheckin(
    userId: string,
    checkin: Omit<MoodCheckinInsert, 'user_id'>
  ): Promise<MoodCheckin> {
    try {
      const { data, error } = await supabase
        .from('mood_checkins')
        .insert({ ...checkin, user_id: userId })
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CREATE', 'mood_checkin', data.id);
      return data;
    } catch (error) {
      console.error('Error creating mood check-in:', error);
      throw error;
    }
  }

  /**
   * Get mood check-ins for a user
   */
  static async getCheckins(
    userId: string,
    cycleId?: string,
    limit: number = 30
  ): Promise<MoodCheckin[]> {
    try {
      let query = supabase
        .from('mood_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      const { data, error } = await query;

      if (error) throw error;

      await AuditService.log(userId, 'LIST', 'mood_checkin', null);
      return data || [];
    } catch (error) {
      console.error('Error fetching mood check-ins:', error);
      throw error;
    }
  }

  /**
   * Get mood trends over time
   */
  static async getMoodTrends(
    userId: string,
    cycleId?: string,
    days: number = 30
  ): Promise<MoodTrend[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('mood_checkins')
        .select('created_at, mood_score, anxiety_level')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (
        data?.map((item) => ({
          date: item.created_at,
          mood_score: item.mood_score || 0,
          anxiety_level: item.anxiety_level || 0,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching mood trends:', error);
      throw error;
    }
  }

  /**
   * Log a symptom
   */
  static async logSymptom(
    userId: string,
    symptom: Omit<SymptomLogInsert, 'user_id'>
  ): Promise<SymptomLog> {
    try {
      const { data, error } = await supabase
        .from('symptom_logs')
        .insert({ ...symptom, user_id: userId })
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CREATE', 'symptom_log', data.id);
      return data;
    } catch (error) {
      console.error('Error logging symptom:', error);
      throw error;
    }
  }

  /**
   * Get symptom logs for a user
   */
  static async getSymptoms(
    userId: string,
    cycleId?: string,
    limit: number = 50
  ): Promise<SymptomLog[]> {
    try {
      let query = supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(limit);

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      const { data, error } = await query;

      if (error) throw error;

      await AuditService.log(userId, 'LIST', 'symptom_log', null);
      return data || [];
    } catch (error) {
      console.error('Error fetching symptom logs:', error);
      throw error;
    }
  }

  /**
   * Get today's check-in status
   */
  static async hasTodayCheckin(userId: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('mood_checkins')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .limit(1);

      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking today\'s check-in:', error);
      return false;
    }
  }
}
