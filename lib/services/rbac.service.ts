import { Database } from '../database.types';
import { supabase } from '../supabase';

type UserRole = Database['public']['Tables']['user_roles']['Row'];

export type Role = 'patient' | 'partner' | 'clinician' | 'admin';

export class RBACService {
  /**
   * Check if user has access to read a cycle
   */
  static async canReadCycle(userId: string, cycleId: string): Promise<boolean> {
    try {
      // Check if user is the patient
      const { data: cycle } = await supabase
        .from('cycles')
        .select('patient_id')
        .eq('id', cycleId)
        .single();

      if (cycle?.patient_id === userId) return true;

      // Check if user has shared access (including non-expiring)
      const now = new Date().toISOString();
      const { data: sharedAccess } = await supabase
        .from('shared_access')
        .select('id')
        .eq('cycle_id', cycleId)
        .eq('granted_to', userId)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .maybeSingle();

      return !!sharedAccess;
    } catch (error) {
      console.error('Error checking cycle read permission:', error);
      return false;
    }
  }

  /**
   * Check if user has write access to a cycle
   */
  static async canWriteCycle(userId: string, cycleId: string): Promise<boolean> {
    try {
      const { data: cycle } = await supabase
        .from('cycles')
        .select('patient_id')
        .eq('id', cycleId)
        .single();

      if (cycle?.patient_id === userId) return true;

      // Check if user has shared write access (including non-expiring)
      const now = new Date().toISOString();
      const { data: sharedAccess } = await supabase
        .from('shared_access')
        .select('id')
        .eq('cycle_id', cycleId)
        .eq('granted_to', userId)
        .eq('access_level', 'write')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .maybeSingle();

      return !!sharedAccess;
    } catch (error) {
      console.error('Error checking cycle write permission:', error);
      return false;
    }
  }

  /**
   * Check if user has access to write medication events
   */
  static async canWriteMedicationEvent(
    userId: string,
    cycleId: string
  ): Promise<boolean> {
    try {
      const role = await this.getUserRole(userId);

      // Check if user is the patient
      const { data: cycle } = await supabase
        .from('cycles')
        .select('patient_id')
        .eq('id', cycleId)
        .single();

      if (cycle?.patient_id === userId) {
        return true;
      }

      // Check if user is partner with write access
      if (role === 'partner') {
        const now = new Date().toISOString();
        const { data: sharedAccess } = await supabase
          .from('shared_access')
          .select('id')
          .eq('cycle_id', cycleId)
          .eq('granted_to', userId)
          .eq('access_level', 'write')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .maybeSingle();

        return !!sharedAccess;
      }

      // Clinicians cannot modify medication events
      return false;
    } catch (error) {
      console.error('Error checking medication write permission:', error);
      return false;
    }
  }

  /**
   * Get user's primary role
   */
  static async getUserRole(userId: string): Promise<Role | null> {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return (data?.role as Role) || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(userId: string, role: Role): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }
}
