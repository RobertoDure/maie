import { File } from 'expo-file-system';
import { Database } from '../database.types';
import { supabase } from '../supabase';
import { AuditService } from './audit.service';

export type UserProfile = Database['public']['Tables']['users']['Row'];
type UserProfileUpdate = Database['public']['Tables']['users']['Update'];

export class UserProfileService {
  /**
   * Get the profile for a user from the public users table
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'VIEW', 'user', userId);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update editable profile fields (full_name, date_of_birth, timezone)
   */
  static async updateProfile(
    userId: string,
    updates: Pick<UserProfileUpdate, 'full_name' | 'date_of_birth' | 'timezone'>,
  ): Promise<UserProfile> {
    try {
      const payload: UserProfileUpdate = {
        full_name: updates.full_name,
        date_of_birth: updates.date_of_birth,
        timezone: updates.timezone,
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      await AuditService.log(userId, 'UPDATE', 'user', userId);
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Upload an avatar image to Supabase Storage and update the user's avatar_url.
   * The file is stored at `avatars/{userId}/avatar.jpg`, overwriting any previous avatar.
   */
  static async uploadAvatar(userId: string, imageUri: string): Promise<string> {
    try {
      const filePath = `${userId}/avatar.jpg`;

      // Read the image file and convert to ArrayBuffer for Supabase upload
      const file = new File(imageUri);
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update the user's avatar_url in the database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('users')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;

      await AuditService.log(userId, 'UPDATE', 'user', userId);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  /**
   * Remove the user's avatar from storage and set avatar_url to null.
   */
  static async removeAvatar(userId: string): Promise<void> {
    try {
      const filePath = `${userId}/avatar.jpg`;

      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('users')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;

      await AuditService.log(userId, 'UPDATE', 'user', userId);
    } catch (error) {
      console.error('Error removing avatar:', error);
      throw error;
    }
  }
}
