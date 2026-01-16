import { Database } from '../database.types';
import { supabase } from '../supabase';
import { AuditService } from './audit.service';
import { RBACService } from './rbac.service';

type Medication = Database['public']['Tables']['medications']['Row'];
type MedicationInsert = Database['public']['Tables']['medications']['Insert'];
type MedicationDosage = Database['public']['Tables']['medication_dosages']['Row'];
type MedicationDosageInsert =
  Database['public']['Tables']['medication_dosages']['Insert'];
type MedicationEvent = Database['public']['Tables']['medication_events']['Row'];
type MedicationEventInsert =
  Database['public']['Tables']['medication_events']['Insert'];

export interface MedicationWithDosages extends Medication {
  dosages: MedicationDosage[];
}

export interface DosageWithEvents extends MedicationDosage {
  events: MedicationEvent[];
}

export class MedicationService {
  /**
   * Get medications for a cycle
   */
  static async getMedications(
    userId: string,
    cycleId: string
  ): Promise<MedicationWithDosages[]> {
    try {
      const hasAccess = await RBACService.canReadCycle(userId, cycleId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const { data: medications, error } = await supabase
        .from('medications')
        .select(`
          *,
          medication_dosages (*)
        `)
        .eq('cycle_id', cycleId);

      if (error) throw error;

      await AuditService.log(userId, 'LIST', 'medication', null);
      return medications as any;
    } catch (error) {
      console.error('Error fetching medications:', error);
      throw error;
    }
  }

  /**
   * Create a medication
   */
  static async createMedication(
    userId: string,
    cycleId: string,
    medication: Omit<MedicationInsert, 'cycle_id'>
  ): Promise<Medication> {
    try {
      const hasAccess = await RBACService.canReadCycle(userId, cycleId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const { data, error } = await supabase
        .from('medications')
        .insert({ ...medication, cycle_id: cycleId })
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CREATE', 'medication', data.id);
      return data;
    } catch (error) {
      console.error('Error creating medication:', error);
      throw error;
    }
  }

  /**
   * Add dosage schedule to a medication
   */
  static async addDosage(
    userId: string,
    medicationId: string,
    dosage: Omit<MedicationDosageInsert, 'medication_id'>
  ): Promise<MedicationDosage> {
    try {
      const { data, error } = await supabase
        .from('medication_dosages')
        .insert({ ...dosage, medication_id: medicationId })
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CREATE', 'medication_dosage', data.id);
      return data;
    } catch (error) {
      console.error('Error adding dosage:', error);
      throw error;
    }
  }

  /**
   * Get upcoming medication events
   */
  static async getUpcomingEvents(
    userId: string,
    cycleId: string,
    limit: number = 10
  ): Promise<MedicationEvent[]> {
    try {
      const hasAccess = await RBACService.canReadCycle(userId, cycleId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Get all medication dosages for this cycle
      const { data: medications } = await supabase
        .from('medications')
        .select('id')
        .eq('cycle_id', cycleId);

      const medicationIds = medications?.map((m) => m.id) || [];

      if (medicationIds.length === 0) return [];

      const { data: dosages } = await supabase
        .from('medication_dosages')
        .select('id')
        .in('medication_id', medicationIds);

      const dosageIds = dosages?.map((d) => d.id) || [];

      if (dosageIds.length === 0) return [];

      const { data: events, error } = await supabase
        .from('medication_events')
        .select('*')
        .in('dosage_id', dosageIds)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return events || [];
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  /**
   * Confirm medication dose taken
   */
  static async confirmDose(
    userId: string,
    dosageId: string,
    takenAt: Date,
    confirmationMethod: string = 'manual'
  ): Promise<MedicationEvent> {
    try {
      // Get the medication and cycle to check permissions
      const { data: dosage } = await supabase
        .from('medication_dosages')
        .select('medication_id')
        .eq('id', dosageId)
        .single();

      if (!dosage) throw new Error('Dosage not found');

      const { data: medication } = await supabase
        .from('medications')
        .select('cycle_id')
        .eq('id', dosage.medication_id)
        .single();

      if (!medication) throw new Error('Medication not found');

      const canWrite = await RBACService.canWriteMedicationEvent(
        userId,
        medication.cycle_id
      );
      if (!canWrite) {
        throw new Error('Access denied');
      }

      const { data, error } = await supabase
        .from('medication_events')
        .insert({
          dosage_id: dosageId,
          scheduled_at: takenAt.toISOString(),
          taken_at: takenAt.toISOString(),
          status: 'taken',
          confirmed_by: userId,
          confirmation_method: confirmationMethod,
        })
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'CONFIRM_DOSE', 'medication_event', data.id);
      return data;
    } catch (error) {
      console.error('Error confirming dose:', error);
      throw error;
    }
  }

  /**
   * Mark medication event as missed
   */
  static async markMissed(
    userId: string,
    eventId: string
  ): Promise<MedicationEvent> {
    try {
      const { data, error } = await supabase
        .from('medication_events')
        .update({ status: 'missed' })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'MARK_MISSED', 'medication_event', eventId);
      return data;
    } catch (error) {
      console.error('Error marking event as missed:', error);
      throw error;
    }
  }

  /**
   * Get missed medication events for a cycle
   */
  static async getMissedEvents(
    userId: string,
    cycleId: string
  ): Promise<MedicationEvent[]> {
    try {
      const hasAccess = await RBACService.canReadCycle(userId, cycleId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const { data: medications } = await supabase
        .from('medications')
        .select('id')
        .eq('cycle_id', cycleId);

      const medicationIds = medications?.map((m) => m.id) || [];

      if (medicationIds.length === 0) return [];

      const { data: dosages } = await supabase
        .from('medication_dosages')
        .select('id')
        .in('medication_id', medicationIds);

      const dosageIds = dosages?.map((d) => d.id) || [];

      if (dosageIds.length === 0) return [];

      const { data: events, error } = await supabase
        .from('medication_events')
        .select('*')
        .in('dosage_id', dosageIds)
        .or('status.eq.missed,status.eq.pending')
        .lt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      return events || [];
    } catch (error) {
      console.error('Error fetching missed events:', error);
      throw error;
    }
  }
}
