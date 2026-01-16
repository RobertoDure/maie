import { Database } from '../database.types';
import { supabase } from '../supabase';
import { AuditService } from './audit.service';
import { RBACService } from './rbac.service';

type Cycle = Database['public']['Tables']['cycles']['Row'];
type CycleInsert = Database['public']['Tables']['cycles']['Insert'];
type CycleUpdate = Database['public']['Tables']['cycles']['Update'];
type CyclePhase = Database['public']['Tables']['cycle_phases']['Row'];

export class CycleService {
  /**
   * Get all cycles for a user (patient or shared)
   */
  static async getCycles(userId: string): Promise<Cycle[]> {
    try {
      // Get cycles where user is patient
      const { data: ownCycles } = await supabase
        .from('cycles')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      // Get cycles where user has shared access
      const { data: sharedAccess } = await supabase
        .from('shared_access')
        .select('cycle_id')
        .eq('granted_to', userId)
        .gt('expires_at', new Date().toISOString());

      const sharedCycleIds = sharedAccess?.map((s) => s.cycle_id) || [];

      if (sharedCycleIds.length > 0) {
        const { data: sharedCycles } = await supabase
          .from('cycles')
          .select('*')
          .in('id', sharedCycleIds)
          .order('created_at', { ascending: false });

        await AuditService.log(userId, 'LIST', 'cycle', null);
        return [...(ownCycles || []), ...(sharedCycles || [])];
      }

      await AuditService.log(userId, 'LIST', 'cycle', null);
      return ownCycles || [];
    } catch (error) {
      console.error('Error fetching cycles:', error);
      throw error;
    }
  }

  /**
   * Get a single cycle by ID
   */
  static async getCycle(userId: string, cycleId: string): Promise<Cycle | null> {
    try {
      const hasAccess = await RBACService.canReadCycle(userId, cycleId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'READ', 'cycle', cycleId);
      return data;
    } catch (error) {
      console.error('Error fetching cycle:', error);
      throw error;
    }
  }

  /**
   * Create a new cycle
   */
  static async createCycle(
    userId: string,
    cycle: Omit<CycleInsert, 'patient_id'>
  ): Promise<Cycle> {
    try {
      const { data, error } = await supabase
        .from('cycles')
        .insert({ ...cycle, patient_id: userId })
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CREATE', 'cycle', data.id);
      return data;
    } catch (error) {
      console.error('Error creating cycle:', error);
      throw error;
    }
  }

  /**
   * Update a cycle
   */
  static async updateCycle(
    userId: string,
    cycleId: string,
    updates: CycleUpdate
  ): Promise<Cycle> {
    try {
      const hasAccess = await RBACService.canReadCycle(userId, cycleId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const { data, error } = await supabase
        .from('cycles')
        .update(updates)
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'UPDATE', 'cycle', cycleId);
      return data;
    } catch (error) {
      console.error('Error updating cycle:', error);
      throw error;
    }
  }

  /**
   * Delete a cycle
   */
  static async deleteCycle(userId: string, cycleId: string): Promise<void> {
    try {
      // Only patient can delete their own cycle
      const { data: cycle } = await supabase
        .from('cycles')
        .select('patient_id')
        .eq('id', cycleId)
        .single();

      if (cycle?.patient_id !== userId) {
        throw new Error('Only the patient can delete their cycle');
      }

      const { error } = await supabase.from('cycles').delete().eq('id', cycleId);

      if (error) throw error;

      await AuditService.log(userId, 'DELETE', 'cycle', cycleId);
    } catch (error) {
      console.error('Error deleting cycle:', error);
      throw error;
    }
  }

  /**
   * Get phases for a cycle
   */
  static async getCyclePhases(
    userId: string,
    cycleId: string
  ): Promise<CyclePhase[]> {
    try {
      const hasAccess = await RBACService.canReadCycle(userId, cycleId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const { data, error } = await supabase
        .from('cycle_phases')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching cycle phases:', error);
      throw error;
    }
  }

  /**
   * Grant access to a cycle
   */
  static async shareAccess(
    userId: string,
    cycleId: string,
    grantedTo: string,
    accessLevel: 'read' | 'write',
    expiresAt?: Date
  ): Promise<void> {
    try {
      // Only patient can share their cycle
      const { data: cycle } = await supabase
        .from('cycles')
        .select('patient_id')
        .eq('id', cycleId)
        .single();

      if (cycle?.patient_id !== userId) {
        throw new Error('Only the patient can share their cycle');
      }

      const { error } = await supabase.from('shared_access').insert({
        cycle_id: cycleId,
        granted_to: grantedTo,
        granted_by: userId,
        access_level: accessLevel,
        expires_at: expiresAt?.toISOString() || null,
      });

      if (error) throw error;

      await AuditService.log(userId, 'SHARE', 'cycle', cycleId);
    } catch (error) {
      console.error('Error sharing cycle:', error);
      throw error;
    }
  }
}
