import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';
import { CycleService } from './cycle.service';
import { MedicationService, MedicationWithDosages } from './medication.service';

/**
 * Lazy-load expo-notifications to avoid the push-token auto-registration
 * side-effect that crashes in Expo Go on SDK 53+.
 */
async function getNotifications(): Promise<typeof NotificationsType> {
  return await import('expo-notifications');
}

const REMINDER_MINUTES_BEFORE = 30;
const SCHEDULE_DAYS_AHEAD = 7;
const ANDROID_CHANNEL_ID = 'medication-reminders';

export class NotificationService {
  /**
   * Request notification permissions from the user.
   * Returns true if granted, false otherwise.
   */
  static async requestPermissions(): Promise<boolean> {
    const Notifications = await getNotifications();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Configure the notification handler (how notifications behave when app is in foreground).
   *
   * @deprecated Handler is now set synchronously at module level in
   * `use-notifications.ts` via `require()`.  Calling this method from an
   * async context was the root cause of notifications being silently
   * dropped — the handler was registered too late.
   */
  static async configureHandler(): Promise<void> {
    const Notifications = await getNotifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Set up the Android notification channel (required for Android 8+).
   *
   * @deprecated Channel is now pre-created at module level in
   * `use-notifications.ts`.  Kept for reference / manual use.
   */
  static async setupAndroidChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      const Notifications = await getNotifications();
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Medication Reminders',
        description: 'Reminders to take your medications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
  }

  /**
   * Cancel all previously scheduled medication reminder notifications.
   */
  static async cancelAllMedicationReminders(): Promise<void> {
    const Notifications = await getNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Schedule medication reminder notifications for the next 7 days.
   * Fetches all active cycles, their medications, and schedules
   * a notification 30 minutes before each dosage time.
   */
  static async scheduleAllMedicationReminders(userId: string): Promise<number> {
    let scheduledCount = 0;

    try {
      // Cancel existing to avoid duplicates
      await this.cancelAllMedicationReminders();

      // Get all cycles for the user
      const cycles = await CycleService.getCycles(userId);
      const activeCycles = cycles.filter((c) => c.status === 'active');

      if (activeCycles.length === 0) return 0;

      const now = new Date();

      for (const cycle of activeCycles) {
        let medications: MedicationWithDosages[];
        try {
          medications = await MedicationService.getMedications(userId, cycle.id);
        } catch {
          continue; // Skip cycles we can't access
        }

        for (const medication of medications) {
          if (!medication.medication_dosages || medication.medication_dosages.length === 0) {
            continue;
          }

          for (const dosage of medication.medication_dosages) {
            if (!dosage.time_of_day) continue;

            const scheduled = await this.scheduleDosageReminders(
              medication,
              dosage,
              cycle.id,
              now
            );
            scheduledCount += scheduled;
          }
        }
      }

      console.log(`[NotificationService] Scheduled ${scheduledCount} medication reminders`);
    } catch (error) {
      console.error('[NotificationService] Error scheduling reminders:', error);
    }

    return scheduledCount;
  }

  /**
   * Schedule reminders for a single dosage across the next 7 days.
   */
  private static async scheduleDosageReminders(
    medication: MedicationWithDosages,
    dosage: { time_of_day: string | null; dosage_amount: number | null; dosage_unit: string | null; id: string },
    cycleId: string,
    now: Date
  ): Promise<number> {
    if (!dosage.time_of_day) return 0;

    // Normalize time_of_day: handle locale-dependent formats like "08.30",
    // "8:30 AM", or "08:30:00" that may have been stored by older code
    // using toLocaleTimeString.
    const parsed = NotificationService.parseTimeOfDay(dosage.time_of_day);
    if (!parsed) {
      console.error(
        `[NotificationService] Invalid time_of_day: "${dosage.time_of_day}" ` +
        `for medication "${medication.name}" (dosage ${dosage.id}). Skipping.`
      );
      return 0;
    }
    const { hours, minutes } = parsed;
    let scheduled = 0;

    // Build notification body with crucial medication info
    const bodyParts: string[] = [];
    if (dosage.dosage_amount && dosage.dosage_unit) {
      bodyParts.push(`${dosage.dosage_amount} ${dosage.dosage_unit}`);
    }
    if (medication.route) {
      bodyParts.push(medication.route);
    }
    if (medication.instructions) {
      bodyParts.push(medication.instructions);
    }
    const body = bodyParts.length > 0
      ? bodyParts.join(' · ')
      : 'Time to prepare for your medication';

    for (let dayOffset = 0; dayOffset < SCHEDULE_DAYS_AHEAD; dayOffset++) {
      const doseDate = new Date(now);
      doseDate.setDate(doseDate.getDate() + dayOffset);
      doseDate.setHours(hours, minutes, 0, 0);

      // Check if medication is within its date range
      if (medication.start_date) {
        const startDate = new Date(medication.start_date);
        startDate.setHours(0, 0, 0, 0);
        if (doseDate < startDate) continue;
      }
      if (medication.end_date) {
        const endDate = new Date(medication.end_date);
        endDate.setHours(23, 59, 59, 999);
        if (doseDate > endDate) continue;
      }

      // Subtract 30 minutes for the reminder time
      const reminderDate = new Date(doseDate.getTime() - REMINDER_MINUTES_BEFORE * 60 * 1000);

      // Skip if the reminder time has already passed
      if (reminderDate <= now) continue;

      try {
        const Notifications = await getNotifications();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 ${medication.name || 'Medication'} in 30 min`,
            body,
            data: {
              screen: '/(tabs)/medications',
              cycleId,
              medicationId: medication.id,
              dosageId: dosage.id,
            },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
            ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
          },
        });
        scheduled++;
      } catch (error) {
        console.error(
          `[NotificationService] Failed to schedule reminder for ${medication.name}:`,
          error
        );
      }
    }

    return scheduled;
  }

  /**
   * Parse a time_of_day string into { hours, minutes }.
   *
   * Handles multiple formats that may have been stored by locale-dependent
   * `toLocaleTimeString` calls:
   *   - "08:30"        (expected HH:mm)
   *   - "08:30:00"     (HH:mm:ss)
   *   - "08.30"        (dot separator — some locales)
   *   - "8:30 AM"      (12-hour with AM/PM)
   *   - "08.30.00"     (dot separator with seconds)
   *
   * Returns null if the string cannot be parsed.
   */
  static parseTimeOfDay(raw: string): { hours: number; minutes: number } | null {
    if (!raw || typeof raw !== 'string') return null;

    const trimmed = raw.trim();

    // Try HH:mm or HH.mm (with optional seconds)
    const match24 = trimmed.match(/^(\d{1,2})[:.:](\d{2})(?:[:.]\d{2})?$/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return { hours: h, minutes: m };
      }
    }

    // Try 12-hour format: "8:30 AM", "08:30 PM", "8.30 am"
    const match12 = trimmed.match(/^(\d{1,2})[:.:](\d{2})(?:[:.]\d{2})?\s*(am|pm)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const period = match12[3].toLowerCase();
      if (period === 'pm' && h < 12) h += 12;
      if (period === 'am' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return { hours: h, minutes: m };
      }
    }

    return null;
  }

  /**
   * Debug helper: get all currently scheduled notifications.
   */
  static async getScheduledNotifications(): Promise<NotificationsType.NotificationRequest[]> {
    const Notifications = await getNotifications();
    return Notifications.getAllScheduledNotificationsAsync();
  }
}
