import { Database } from '../database.types';
import { supabase } from '../supabase';

type AuditLog = Database['public']['Tables']['audit_logs']['Insert'];

export class AuditService {
  static async log(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    ipAddress?: string
  ): Promise<void> {
    try {
      const auditLog: AuditLog = {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        ip_address: ipAddress,
      };

      await supabase.from('audit_logs').insert(auditLog);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }
}
