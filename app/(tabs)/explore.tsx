import { AppointmentCard } from '@/components/appointment-card';
import { Calendar } from '@/components/calendar';
import { ProfileAvatar } from '@/components/profile-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, SemanticColors, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService, MedicationService, MoodService, UserProfileService } from '@/lib/services';
import { AppointmentService } from '@/lib/services/appointment.service';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const getCycleDay = (startDate: string) => {
  const start = new Date(startDate);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 1;
};

type Cycle = Database['public']['Tables']['cycles']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

export default function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [medicationCount, setMedicationCount] = useState(0);
  const [hasTodayCheckin, setHasTodayCheckin] = useState(false);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const [cycles, todayCheckin, monthApts, profile] = await Promise.all([
        CycleService.getCycles(user.id),
        MoodService.hasTodayCheckin(user.id),
        AppointmentService.getAppointmentsByDateRange(user.id, startDate, endDate),
        UserProfileService.getProfile(user.id),
      ]);

      const active = cycles.find((c) => c.status === 'active') || cycles[0] || null;
      setActiveCycle(active);
      setHasTodayCheckin(todayCheckin);
      setMonthAppointments(monthApts);
      setAvatarUrl(profile?.avatar_url ?? null);

      if (active) {
        const meds = await MedicationService.getMedications(user.id, active.id);
        setMedicationCount(meds.length);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDayAppointments = useCallback(async () => {
    if (!user) return;
    try {
      const data = await AppointmentService.getAppointmentsByDate(user.id, selectedDate);
      setDayAppointments(data);
    } catch (error) {
      console.error('Error loading day appointments:', error);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    loadDashboardData();
  }, [user, currentMonth]); // Reload when month changes

  useEffect(() => {
    loadDayAppointments();
  }, [loadDayAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    loadDayAppointments();
  };

  // Handle date selection - Update selected date to show appointments below
  const onDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Get marked dates for calendar
  const markedDates = monthAppointments
    .filter((apt) => apt.scheduled_at)
    .map((apt) => {
      const date = new Date(apt.scheduled_at!);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const getGreetingDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    // Capitalize first letter of each word
    return now.toLocaleDateString('en-US', options)
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* New User Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <ProfileAvatar size={48} uri={avatarUrl} />
          <View>
            <Text style={styles.greetingLabel}>Hello</Text>
            <Text style={styles.userName}>
              {user?.user_metadata?.full_name?.split(' ')[0]}!
            </Text>
          </View>
        </View>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{getGreetingDate()}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BrandColors.primary} />
        }
      >
        {/* Calendar - FIRST COMPONENT */}
        <View style={styles.calendarContainer}>
          <Text style={styles.selectedDateLabel}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          {activeCycle && activeCycle.start_date && (
            <View style={styles.cycleDayContainer}>
            </View>
          )}
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={onDateSelect}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            markedDates={markedDates}
          />
        </View>

        {/* Selected Day Appointments - Display "Today's" or current selected date's appointments inline as well */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isToday ? 'Appointment of the Day' : `Appointments for ${selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
            </Text>
            {activeCycle && (
              <TouchableOpacity
                onPress={() => router.push(`/cycle/${activeCycle.id}/appointments` as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {dayAppointments.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No appointments for this day</Text>
            </View>
          ) : (
            dayAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onPress={activeCycle
                  ? () => router.push(`/cycle/${activeCycle.id}/appointments` as any)
                  : undefined
                }
              />
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, !hasTodayCheckin && styles.quickActionHighlight]}
            onPress={() => router.push('/(tabs)/mood')}
          >
            <IconSymbol
              name={hasTodayCheckin ? 'checkmark.circle.fill' : 'heart'}
              size={28}
              color={hasTodayCheckin ? SemanticColors.success : BrandColors.accent}
            />
            <Text style={styles.quickActionText}>
              {hasTodayCheckin ? 'Checked In' : 'Mood'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/medications')}
          >
            <IconSymbol name="pills" size={28} color={BrandColors.primary} />
            <Text style={styles.quickActionText}>Medications</Text>
          </TouchableOpacity>
        </View>

        {/* Active Cycle Card */}
        {activeCycle ? (
          <TouchableOpacity
            style={styles.cycleCard}
            onPress={() => router.push(`/cycle/${activeCycle.id}` as any)}
          >
            <View style={styles.cycleHeader}>
              <View>
                <Text style={styles.cycleLabel}>Active Cycle</Text>
                <Text style={styles.cycleType}>{activeCycle.cycle_type}</Text>
              </View>
              <View style={styles.cycleStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{medicationCount}</Text>
                  <Text style={styles.statLabel}>Meds</Text>
                </View>
              </View>
            </View>
            {activeCycle.clinic_name && (
              <Text style={styles.clinicName}>{activeCycle.clinic_name}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.noCycleCard}>
            <IconSymbol name="calendar.badge.plus" size={48} color={NeutralColors.gray300} />
            <Text style={styles.noCycleText}>No active cycle</Text>
            <TouchableOpacity
              style={styles.createCycleButton}
              onPress={() => router.push('/cycle/new')}
            >
              <Text style={styles.createCycleButtonText}>Start a Cycle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips of the Day</Text>
          <View style={styles.tipCard}>
            <IconSymbol name="lightbulb" size={24} color={SemanticColors.warning} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Stay Hydrated</Text>
              <Text style={styles.tipText}>
                Drinking plenty of water helps support hormonal function and may reduce some medication side effects.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.gray50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: NeutralColors.white,
    // Removed border bottom for cleaner look or keep if needed
    borderBottomWidth: 0,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetingLabel: {
    fontSize: 14,
    color: NeutralColors.gray400,
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BrandColors.primary,
  },
  datePill: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  calendarContainer: {
    marginBottom: 24,
    marginTop: 0,
    alignItems: 'center', // Center the cycle day
  },
  selectedDateLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: 12,
    textAlign: 'center',
  },
  cycleDayContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cycleDayLabel: {
    fontSize: 16,
    color: NeutralColors.gray500,
    fontWeight: '500',
    marginBottom: 4,
  },
  cycleDayValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: BrandColors.accent, // Mint color
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Shadows.md,
  },
  quickActionHighlight: {
    borderWidth: 2,
    borderColor: BrandColors.accent,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    color: NeutralColors.gray900,
  },
  cycleCard: {
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cycleLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  cycleType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  cycleStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  clinicName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 12,
  },
  noCycleCard: {
    backgroundColor: NeutralColors.white,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    ...Shadows.md,
  },
  noCycleText: {
    fontSize: 16,
    color: NeutralColors.gray400,
    marginTop: 12,
    marginBottom: 16,
  },
  createCycleButton: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createCycleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  seeAllText: {
    fontSize: 14,
    color: BrandColors.accent,
    fontWeight: '500',
  },
  emptySection: {
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.gray400,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: SemanticColors.warningLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: NeutralColors.gray500,
    lineHeight: 20,
  },
});
