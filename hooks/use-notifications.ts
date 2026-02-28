import { useAuth } from '@/contexts/auth-context';
import Constants from 'expo-constants';
import { type EventSubscription } from 'expo-modules-core';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Returns true when running inside Expo Go (where remote push
 * notifications are no longer supported as of SDK 53).
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/*
 * ─── Module-level notification setup ───────────────────────────────────
 *
 * CRITICAL: Expo requires `setNotificationHandler` to be called
 * **synchronously at module load time**.  If it is deferred (inside
 * useEffect or behind an async `import()`) the handler will NOT be
 * ready when a notification fires, and the OS will silently drop it.
 *
 * We use `require()` (synchronous) instead of `await import()` so the
 * handler is registered before React even starts rendering.
 * The try/catch prevents crashes in Expo Go where the native module
 * is unavailable.
 */
if (!isExpoGo()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Pre-create the Android notification channel so scheduled
    // notifications can reference it immediately.
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('medication-reminders', {
        name: 'Medication Reminders',
        description: 'Reminders to take your medications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      }).catch((e: unknown) =>
        console.warn('[Notifications] Android channel setup failed:', e)
      );
    }

    console.log('[Notifications] Handler and channel configured at module level');
  } catch (e) {
    console.warn('[Notifications] Module-level setup failed (expected in Expo Go):', e);
  }
}

/**
 * Hook that initializes medication reminder notifications.
 *
 * - Requests permissions on first mount (when user is authenticated).
 * - Schedules a rolling 7-day window of medication reminders.
 * - Handles notification tap to deep-link to the medications screen.
 *
 * The foreground notification handler and Android channel are configured
 * synchronously at module level (above) — NOT inside this hook.
 *
 * Should be called once in the root layout.
 */
export function useNotifications() {
  const { user } = useAuth();
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;

    // Push-token APIs are unavailable in Expo Go on SDK 53+.
    if (isExpoGo()) {
      console.log(
        '[useNotifications] Running in Expo Go — skipping notification setup. ' +
          'Use a development build to enable full notification support.'
      );
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const Notifications = await import('expo-notifications');
        const { NotificationService } = await import('@/lib/services/notification.service');

        // Handler is configured at module level (sync require).
        // Ensure the Android channel is ready before scheduling. The
        // module-level call is fire-and-forget; re-create here with await
        // so we block until it exists.
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('medication-reminders', {
              name: 'Medication Reminders',
              description: 'Reminders to take your medications',
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 250, 250, 250],
              sound: 'default',
            });
            console.log('[useNotifications] Android channel confirmed ready');
          } catch (channelErr) {
            console.error('[useNotifications] Android channel creation failed:', channelErr);
          }
        }

        // 1. Request permissions (includes POST_NOTIFICATIONS on Android 13+)
        const granted = await NotificationService.requestPermissions();
        if (!granted) {
          console.warn(
            '[useNotifications] Notification permission denied by user. ' +
              'Reminders will not fire.'
          );
          return;
        }

        console.log('[useNotifications] Permission granted — scheduling reminders…');

        // 2. Schedule medication reminders (rolling 7-day window)
        if (isMounted) {
          const count = await NotificationService.scheduleAllMedicationReminders(user.id);
          console.log(`[useNotifications] Scheduled ${count} medication reminders`);

          // Debug: verify what the OS actually has queued
          const queued = await NotificationService.getScheduledNotifications();
          console.log(
            `[useNotifications] OS reports ${queued.length} scheduled notifications`
          );
          if (queued.length > 0) {
            const next = queued[0];
            console.log(
              '[useNotifications] Next notification:',
              JSON.stringify({
                identifier: next.identifier,
                trigger: next.trigger,
                content: {
                  title: next.content.title,
                  body: next.content.body,
                  data: next.content.data,
                },
              }, null, 2)
            );
          }
        }

        // 3. Listen for notification tap → deep-link to medications screen
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            if (data?.screen) {
              router.push(data.screen as any);
            }
          }
        );
      } catch (error) {
        console.error('[useNotifications] Notification init failed:', error);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);
}
