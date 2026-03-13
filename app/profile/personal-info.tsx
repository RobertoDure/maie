import { AvatarPickerSheet } from '@/components/avatar-picker-sheet';
import { ProfileAvatar } from '@/components/profile-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
    BrandColors,
    NeutralColors,
    SemanticColors,
    Shadows,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/services';
import { UserProfileService } from '@/lib/services';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

/** Common timezones for the picker */
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatMemberSince(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Applies a DD-MM-YYYY input mask to the text.
 */
function applyDateMask(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/** Converts DD-MM-YYYY (display) to YYYY-MM-DD (storage). */
function displayToStorageDate(display: string): string {
  const parts = display.split('-');
  if (parts.length !== 3) return display;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Converts YYYY-MM-DD (storage) to DD-MM-YYYY (display). */
function storageToDisplayDate(storage: string): string {
  const parts = storage.split('-');
  if (parts.length !== 3) return storage;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Validates a date string in DD-MM-YYYY format.
 * Returns true if valid, false otherwise.
 */
function isValidDateString(value: string): boolean {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return false;
  const [dd, mm, yyyy] = value.split('-');
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return (
    date.getFullYear() === Number(yyyy) &&
    date.getMonth() === Number(mm) - 1 &&
    date.getDate() === Number(dd)
  );
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [timezone, setTimezone] = useState('');
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarSheetRef = useRef<BottomSheet>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await UserProfileService.getProfile(user.id);
      setProfile(data);
      if (data) {
        setFullName(data.full_name ?? '');
        setDateOfBirth(data.date_of_birth ? storageToDisplayDate(data.date_of_birth) : '');
        setTimezone(data.timezone ?? '');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load profile information.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate full name is not empty
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Full name cannot be empty.');
      return;
    }

    // Validate date of birth if provided
    if (dateOfBirth && !isValidDateString(dateOfBirth)) {
      Alert.alert('Invalid Date', 'Please enter the date in DD-MM-YYYY format (e.g. 15-03-1990).');
      return;
    }

    try {
      setSaving(true);
      const updated = await UserProfileService.updateProfile(user.id, {
        full_name: fullName.trim() || null,
        date_of_birth: dateOfBirth.trim() ? displayToStorageDate(dateOfBirth.trim()) : null,
        timezone: timezone.trim() || null,
      });
      setProfile(updated);
      setEditing(false);
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current profile values
    if (profile) {
      setFullName(profile.full_name ?? '');
      setDateOfBirth(profile.date_of_birth ? storageToDisplayDate(profile.date_of_birth) : '');
      setTimezone(profile.timezone ?? '');
    }
    setShowTimezonePicker(false);
    setEditing(false);
  };

  const handleAvatarImageSelected = async (uri: string) => {
    if (!user?.id) return;
    try {
      setAvatarLoading(true);
      const publicUrl = await UserProfileService.uploadAvatar(user.id, uri);
      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
    } catch {
      Alert.alert('Error', 'Failed to upload profile photo.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setAvatarLoading(true);
            await UserProfileService.removeAvatar(user.id);
            setProfile((prev) => prev ? { ...prev, avatar_url: null } : prev);
          } catch {
            Alert.alert('Error', 'Failed to remove profile photo.');
          } finally {
            setAvatarLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={BrandColors.primary} />
            <Text style={styles.backText}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={BrandColors.primary} />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.headerRight}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleCancel} style={styles.headerRight}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <ProfileAvatar
              size={100}
              uri={profile?.avatar_url}
              showEditButton
              onEditPress={() => avatarSheetRef.current?.expand()}
              loading={avatarLoading}
            />
          </View>

          {/* Info fields */}
          <View style={styles.card}>
            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={NeutralColors.gray300}
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile?.full_name || 'Not set'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Email (always read-only) */}
            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Email</Text>
                <IconSymbol name="lock" size={14} color={NeutralColors.gray300} />
              </View>
              <Text style={styles.fieldValue}>{user?.email ?? 'Not set'}</Text>
            </View>

            <View style={styles.divider} />

            {/* Date of Birth */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={dateOfBirth}
                  onChangeText={(text) => setDateOfBirth(applyDateMask(text))}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor={NeutralColors.gray300}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {formatDate(profile?.date_of_birth ?? null)}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Timezone */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Timezone</Text>
              {editing ? (
                <View>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowTimezonePicker(!showTimezonePicker)}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !timezone && { color: NeutralColors.gray300 },
                      ]}
                    >
                      {timezone || 'Select timezone'}
                    </Text>
                    <IconSymbol
                      name={showTimezonePicker ? 'chevron.up' : 'chevron.down'}
                      size={14}
                      color={NeutralColors.gray400}
                    />
                  </TouchableOpacity>
                  {showTimezonePicker && (
                    <Modal
                      transparent
                      visible={showTimezonePicker}
                      animationType="fade"
                      onRequestClose={() => setShowTimezonePicker(false)}
                    >
                      <TouchableOpacity
                        style={styles.timezoneOverlay}
                        activeOpacity={1}
                        onPress={() => setShowTimezonePicker(false)}
                      >
                        <View style={styles.timezoneModal}>
                          <Text style={styles.timezoneModalTitle}>Select Timezone</Text>
                          <ScrollView style={styles.timezoneScrollList} nestedScrollEnabled>
                            {TIMEZONES.map((tz) => (
                              <TouchableOpacity
                                key={tz}
                                style={[
                                  styles.timezoneOption,
                                  tz === timezone && styles.timezoneOptionSelected,
                                ]}
                                onPress={() => {
                                  setTimezone(tz);
                                  setShowTimezonePicker(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.timezoneOptionText,
                                    tz === timezone && styles.timezoneOptionTextSelected,
                                  ]}
                                >
                                  {tz}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  )}
                </View>
              ) : (
                <Text style={styles.fieldValue}>
                  {profile?.timezone || 'Not set'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Account Status (read-only) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Account Status</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: profile?.is_active
                        ? SemanticColors.success
                        : SemanticColors.error,
                    },
                  ]}
                />
                <Text style={styles.fieldValue}>
                  {profile?.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Member Since (read-only) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Member Since</Text>
              <Text style={styles.fieldValue}>
                {profile?.created_at
                  ? formatMemberSince(profile.created_at)
                  : 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Save button (edit mode) */}
          {editing && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AvatarPickerSheet
        ref={avatarSheetRef}
        onImageSelected={handleAvatarImageSelected}
        onRemovePhoto={handleRemoveAvatar}
        hasExistingAvatar={!!profile?.avatar_url}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backText: {
    fontSize: 16,
    color: BrandColors.primary,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
    textAlign: 'center',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  editButtonText: {
    fontSize: 16,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  cancelButtonText: {
    fontSize: 16,
    color: SemanticColors.error,
    fontWeight: '500',
  },
  // Content
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  // Card
  card: {
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    padding: 4,
    ...Shadows.md,
  },
  field: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: NeutralColors.gray400,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: NeutralColors.gray900,
  },
  divider: {
    height: 1,
    backgroundColor: NeutralColors.gray100,
    marginHorizontal: 16,
  },
  // Inputs
  input: {
    fontSize: 16,
    color: NeutralColors.gray900,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: NeutralColors.gray50,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: NeutralColors.gray50,
  },
  pickerButtonText: {
    fontSize: 16,
    color: NeutralColors.gray900,
  },
  timezoneOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timezoneModal: {
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    width: '100%',
    maxHeight: 400,
    overflow: 'hidden',
    ...Shadows.md,
  },
  timezoneModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: NeutralColors.gray900,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  timezoneScrollList: {
    maxHeight: 340,
  },
  timezoneOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  timezoneOptionSelected: {
    backgroundColor: '#EDE9FE',
  },
  timezoneOptionText: {
    fontSize: 15,
    color: NeutralColors.gray900,
  },
  timezoneOptionTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Save button
  saveButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
