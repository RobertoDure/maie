export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string | null
          full_name: string | null
          date_of_birth: string | null
          timezone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash?: string | null
          full_name?: string | null
          date_of_birth?: string | null
          timezone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string | null
          full_name?: string | null
          date_of_birth?: string | null
          timezone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          role?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          id: string
          patient_id: string | null
          cycle_type: string | null
          start_date: string | null
          end_date: string | null
          status: string | null
          clinic_name: string | null
          protocol_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id?: string | null
          cycle_type?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
          clinic_name?: string | null
          protocol_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string | null
          cycle_type?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
          clinic_name?: string | null
          protocol_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cycle_phases: {
        Row: {
          id: string
          cycle_id: string | null
          phase: string | null
          start_date: string | null
          end_date: string | null
          order_index: number | null
        }
        Insert: {
          id?: string
          cycle_id?: string | null
          phase?: string | null
          start_date?: string | null
          end_date?: string | null
          order_index?: number | null
        }
        Update: {
          id?: string
          cycle_id?: string | null
          phase?: string | null
          start_date?: string | null
          end_date?: string | null
          order_index?: number | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          cycle_id: string | null
          title: string | null
          appointment_type: string | null
          scheduled_at: string | null
          location: string | null
          clinician_name: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cycle_id?: string | null
          title?: string | null
          appointment_type?: string | null
          scheduled_at?: string | null
          location?: string | null
          clinician_name?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cycle_id?: string | null
          title?: string | null
          appointment_type?: string | null
          scheduled_at?: string | null
          location?: string | null
          clinician_name?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          id: string
          cycle_id: string | null
          name: string | null
          route: string | null
          purpose: string | null
          start_date: string | null
          end_date: string | null
          instructions: string | null
        }
        Insert: {
          id?: string
          cycle_id?: string | null
          name?: string | null
          route?: string | null
          purpose?: string | null
          start_date?: string | null
          end_date?: string | null
          instructions?: string | null
        }
        Update: {
          id?: string
          cycle_id?: string | null
          name?: string | null
          route?: string | null
          purpose?: string | null
          start_date?: string | null
          end_date?: string | null
          instructions?: string | null
        }
        Relationships: []
      }
      medication_dosages: {
        Row: {
          id: string
          medication_id: string | null
          dosage_amount: number | null
          dosage_unit: string | null
          time_of_day: string | null
          frequency: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medication_id?: string | null
          dosage_amount?: number | null
          dosage_unit?: string | null
          time_of_day?: string | null
          frequency?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          medication_id?: string | null
          dosage_amount?: number | null
          dosage_unit?: string | null
          time_of_day?: string | null
          frequency?: string | null
          created_at?: string
        }
        Relationships: []
      }
      medication_events: {
        Row: {
          id: string
          dosage_id: string | null
          scheduled_at: string | null
          taken_at: string | null
          status: string | null
          confirmed_by: string | null
          confirmation_method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dosage_id?: string | null
          scheduled_at?: string | null
          taken_at?: string | null
          status?: string | null
          confirmed_by?: string | null
          confirmation_method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          dosage_id?: string | null
          scheduled_at?: string | null
          taken_at?: string | null
          status?: string | null
          confirmed_by?: string | null
          confirmation_method?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: string
          attachment_url: string | null
          reply_to_id: string | null
          is_deleted: boolean
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: string
          attachment_url?: string | null
          reply_to_id?: string | null
          is_deleted?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: string
          attachment_url?: string | null
          reply_to_id?: string | null
          is_deleted?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      message_read_receipts: {
        Row: {
          conversation_id: string
          user_id: string
          last_read_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          last_read_at: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
          last_read_at?: string
        }
        Relationships: []
      }
      mood_checkins: {
        Row: {
          id: string
          user_id: string | null
          cycle_id: string | null
          mood_score: number | null
          anxiety_level: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          cycle_id?: string | null
          mood_score?: number | null
          anxiety_level?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          cycle_id?: string | null
          mood_score?: number | null
          anxiety_level?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      symptom_logs: {
        Row: {
          id: string
          user_id: string | null
          cycle_id: string | null
          symptom: string | null
          severity: number | null
          notes: string | null
          logged_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          cycle_id?: string | null
          symptom?: string | null
          severity?: number | null
          notes?: string | null
          logged_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          cycle_id?: string | null
          symptom?: string | null
          severity?: number | null
          notes?: string | null
          logged_at?: string
        }
        Relationships: []
      }
      shared_access: {
        Row: {
          id: string
          cycle_id: string | null
          granted_to: string | null
          granted_by: string | null
          access_level: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cycle_id?: string | null
          granted_to?: string | null
          granted_by?: string | null
          access_level?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cycle_id?: string | null
          granted_to?: string | null
          granted_by?: string | null
          access_level?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string | null
          entity_type: string | null
          entity_id: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action?: string | null
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string | null
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
