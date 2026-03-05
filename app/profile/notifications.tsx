import { IconSymbol } from '@/components/ui/icon-symbol';
import {
    BrandColors,
    NeutralColors,
    SemanticColors,
    Shadows,
} from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    AppState,
    Linking,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

/**
 * Notification preferences persisted as local state for now.
 * Replace with a user-profile service call once supported server-side.
 */
interface NotificationPrefs {
  /** Master toggle – when off every other notification is suppressed */
  pushEnabled: boolean;
  /** Medication dosage reminders */
  medicationReminders: boolean;
  /** Appointment reminders */
  appointmentReminders: boolean;
  /** Cycle milestone updates */
  cycleUpdates: boolean;
  /** Daily mood-check-in nudge */
  moodCheckIn: boolean;
  /** Tips & educational content */
  tipsAndInsights: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  pushEnabled: true,
  medicationReminders: true,
  appointmentReminders: true,
  cycleUpdates: true,
  moodCheckIn: true,
  tipsAndInsights: false,
};

export default function NotificationsScreen() {
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [systemPermission, setSystemPermission] = useState<
    'granted' | 'denied' | 'undetermined'
  >('undetermined');

  /* ------------------------------------------------------------------ */
  /*  Check OS-level permission on mount & when app returns to foreground */
  /* ------------------------------------------------------------------ */
  const checkPermission = useCallback(async () => {
    try {
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      setSystemPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
    } catch {
      // Expo Go / missing native module
      setSystemPermission('undetermined');
    }
  }, []);

  useEffect(() => {
    checkPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPermission();
    });
    return () => sub.remove();
  }, [checkPermission]);

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */
  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMasterToggle = async () => {
    if (!prefs.pushEnabled) {
      // Turning ON → ensure OS permission is granted
      if (systemPermission !== 'granted') {
        try {
          const Notifications = await import('expo-notifications');
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Permission Required',
              'Notifications are disabled at the system level. Open Settings to enable them.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ],
            );
            return;
          }
          setSystemPermission('granted');
        } catch {
          // fallback – open settings
          Linking.openSettings();
          return;
        }
      }
    }
    togglePref('pushEnabled');
  };

  const openSystemSettings = () => Linking.openSettings();

  const masterOff = !prefs.pushEnabled || systemPermission === 'denied';

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={BrandColors.primary} />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* System permission warning */}
        {systemPermission === 'denied' && (
          <TouchableOpacity style={styles.warningBanner} onPress={openSystemSettings}>
            <IconSymbol name="exclamationmark.triangle" size={18} color={SemanticColors.warning} />
            <Text style={styles.warningText}>
              Notifications are blocked at the system level. Tap here to open Settings.
            </Text>
            <IconSymbol name="chevron.right" size={14} color={NeutralColors.gray300} />
          </TouchableOpacity>
        )}

        {/* Push Notifications Master Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.primary + '15' }]}>
                  <IconSymbol name="bell" size={18} color={BrandColors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive reminders, updates, and alerts on your device
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs.pushEnabled && systemPermission !== 'denied'}
                onValueChange={handleMasterToggle}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>
          </View>
        </View>

        {/* Reminder Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={[styles.card, masterOff && styles.cardDisabled]}>
            {/* Medication Reminders */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: SemanticColors.successLight }]}>
                  <IconSymbol name="pills" size={18} color={SemanticColors.success} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, masterOff && styles.labelDisabled]}>
                    Medication Reminders
                  </Text>
                  <Text style={styles.settingDescription}>
                    Get notified before each scheduled dosage
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs.medicationReminders && !masterOff}
                onValueChange={() => togglePref('medicationReminders')}
                disabled={masterOff}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>

            <View style={styles.divider} />

            {/* Appointment Reminders */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: SemanticColors.infoLight }]}>
                  <IconSymbol name="calendar" size={18} color={SemanticColors.info} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, masterOff && styles.labelDisabled]}>
                    Appointment Reminders
                  </Text>
                  <Text style={styles.settingDescription}>
                    Reminders for upcoming appointments
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs.appointmentReminders && !masterOff}
                onValueChange={() => togglePref('appointmentReminders')}
                disabled={masterOff}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>
          </View>
        </View>

        {/* Activity & Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity & Insights</Text>
          <View style={[styles.card, masterOff && styles.cardDisabled]}>
            {/* Cycle Updates */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.accent + '15' }]}>
                  <IconSymbol name="heart" size={18} color={BrandColors.accent} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, masterOff && styles.labelDisabled]}>
                    Cycle Updates
                  </Text>
                  <Text style={styles.settingDescription}>
                    Milestones and progress updates for your active cycles
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs.cycleUpdates && !masterOff}
                onValueChange={() => togglePref('cycleUpdates')}
                disabled={masterOff}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>

            <View style={styles.divider} />

            {/* Mood Check-In */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: SemanticColors.warningLight }]}>
                  <IconSymbol name="face.smiling" size={18} color={SemanticColors.warning} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, masterOff && styles.labelDisabled]}>
                    Daily Mood Check-In
                  </Text>
                  <Text style={styles.settingDescription}>
                    A gentle reminder to log how you're feeling each day
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs.moodCheckIn && !masterOff}
                onValueChange={() => togglePref('moodCheckIn')}
                disabled={masterOff}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>

            <View style={styles.divider} />

            {/* Tips & Insights */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.primary + '15' }]}>
                  <IconSymbol name="lightbulb" size={18} color={BrandColors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, masterOff && styles.labelDisabled]}>
                    Tips & Insights
                  </Text>
                  <Text style={styles.settingDescription}>
                    Helpful fertility and wellness tips delivered weekly
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs.tipsAndInsights && !masterOff}
                onValueChange={() => togglePref('tipsAndInsights')}
                disabled={masterOff}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>
          </View>
        </View>

        {/* Info footer */}
        <View style={styles.infoNotice}>
          <IconSymbol name="info.circle" size={16} color={NeutralColors.gray400} />
          <Text style={styles.infoText}>
            Notification preferences are stored on this device. You can also manage
            notifications from your device's Settings app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    flex: 2,
  },
  headerRight: {
    flex: 1,
  },
  /* Content */
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  /* Warning banner */
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SemanticColors.warningLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: NeutralColors.gray500,
    lineHeight: 18,
  },
  /* Sections */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: 12,
  },
  /* Cards */
  card: {
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  /* Setting rows */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: NeutralColors.gray900,
  },
  labelDisabled: {
    color: NeutralColors.gray300,
  },
  settingDescription: {
    fontSize: 13,
    color: NeutralColors.gray400,
    marginTop: 2,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: NeutralColors.gray100,
    marginLeft: 64,
  },
  /* Info footer */
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Shadows.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: NeutralColors.gray400,
    marginLeft: 10,
    lineHeight: 18,
  },
});
