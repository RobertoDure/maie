import { Database } from '../database.types';
import { supabase } from '../supabase';
import { AuditService } from './audit.service';
import { RBACService } from './rbac.service';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export class AppointmentService {
    /**
     * Get appointments for a cycle
     */
    static async getAppointments(
        userId: string,
        cycleId: string
    ): Promise<Appointment[]> {
        try {
            const hasAccess = await RBACService.canReadCycle(userId, cycleId);
            if (!hasAccess) {
                throw new Error('Access denied');
            }

            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('cycle_id', cycleId)
                .order('scheduled_at', { ascending: true });

            if (error) throw error;

            await AuditService.log(userId, 'LIST', 'appointment', null);
            return data || [];
        } catch (error) {
            console.error('Error fetching appointments:', error);
            throw error;
        }
    }

    /**
     * Get upcoming appointments for a user
     */
    static async getUpcomingAppointments(
        userId: string,
        limit: number = 5
    ): Promise<Appointment[]> {
        try {
            // Get all cycles for user
            const { data: cycles } = await supabase
                .from('cycles')
                .select('id')
                .eq('patient_id', userId);

            const cycleIds = cycles?.map((c) => c.id) || [];

            if (cycleIds.length === 0) return [];

            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .in('cycle_id', cycleIds)
                .gte('scheduled_at', new Date().toISOString())
                .order('scheduled_at', { ascending: true })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching upcoming appointments:', error);
            throw error;
        }
    }

    /**
     * Create an appointment
     */
    static async createAppointment(
        userId: string,
        cycleId: string,
        appointment: Omit<AppointmentInsert, 'cycle_id'>
    ): Promise<Appointment> {
        try {
            const hasAccess = await RBACService.canReadCycle(userId, cycleId);
            if (!hasAccess) {
                throw new Error('Access denied');
            }

            const { data, error } = await supabase
                .from('appointments')
                .insert({ ...appointment, cycle_id: cycleId })
                .select()
                .single();

            if (error) throw error;

            await AuditService.log(userId, 'CREATE', 'appointment', data.id);
            return data;
        } catch (error) {
            console.error('Error creating appointment:', error);
            throw error;
        }
    }

    /**
     * Update an appointment
     */
    static async updateAppointment(
        userId: string,
        appointmentId: string,
        updates: AppointmentUpdate
    ): Promise<Appointment> {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .update(updates)
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            await AuditService.log(userId, 'UPDATE', 'appointment', appointmentId);
            return data;
        } catch (error) {
            console.error('Error updating appointment:', error);
            throw error;
        }
    }

    /**
     * Delete an appointment
     */
    static async deleteAppointment(
        userId: string,
        appointmentId: string
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointmentId);

            if (error) throw error;

            await AuditService.log(userId, 'DELETE', 'appointment', appointmentId);
        } catch (error) {
            console.error('Error deleting appointment:', error);
            throw error;
        }
    }
}
