import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService, MedicationService, MoodService } from '@/lib/services';
import { AppointmentService } from '@/lib/services/appointment.service';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Cycle = Database['public']['Tables']['cycles']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

export default function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [medicationCount, setMedicationCount] = useState(0);
  const [hasTodayCheckin, setHasTodayCheckin] = useState(false);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [cycles, appointments, todayCheckin] = await Promise.all([
        CycleService.getCycles(user.id),
        AppointmentService.getUpcomingAppointments(user.id, 3),
        MoodService.hasTodayCheckin(user.id),
      ]);

      const active = cycles.find((c) => c.status === 'active') || cycles[0] || null;
      setActiveCycle(active);
      setUpcomingAppointments(appointments);
      setHasTodayCheckin(todayCheckin);

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

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, !hasTodayCheckin && styles.quickActionHighlight]}
            onPress={() => router.push('/(tabs)/mood')}
          >
            <IconSymbol
              name={hasTodayCheckin ? 'checkmark.circle.fill' : 'heart'}
              size={28}
              color={hasTodayCheckin ? '#34C759' : '#FF2D55'}
            />
            <Text style={styles.quickActionText}>
              {hasTodayCheckin ? 'Checked In' : 'Mood Check-in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/medications')}
          >
            <IconSymbol name="pills" size={28} color="#FF9500" />
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
            <IconSymbol name="calendar.badge.plus" size={48} color="#ccc" />
            <Text style={styles.noCycleText}>No active cycle</Text>
            <TouchableOpacity
              style={styles.createCycleButton}
              onPress={() => router.push('/cycle/new')}
            >
              <Text style={styles.createCycleButtonText}>Start a Cycle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            {activeCycle && (
              <TouchableOpacity
                onPress={() => router.push(`/cycle/${activeCycle.id}/appointments` as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {upcomingAppointments.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No upcoming appointments</Text>
            </View>
          ) : (
            upcomingAppointments.map((apt) => (
              <View key={apt.id} style={styles.appointmentCard}>
                <View style={styles.appointmentIcon}>
                  <IconSymbol name="calendar" size={20} color="#007AFF" />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentTitle}>{apt.title}</Text>
                  <Text style={styles.appointmentTime}>
                    {formatDate(apt.scheduled_at!)}
                  </Text>
                  {apt.location && (
                    <Text style={styles.appointmentLocation}>{apt.location}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journey Tips</Text>
          <View style={styles.tipCard}>
            <IconSymbol name="lightbulb" size={24} color="#FF9500" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Stay Hydrated</Text>
              <Text style={styles.tipText}>
                Drinking plenty of water helps support hormone function and can reduce some medication side effects.
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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionHighlight: {
    borderWidth: 2,
    borderColor: '#FF2D55',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    color: '#333',
  },
  cycleCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  noCycleText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 16,
  },
  createCycleButton: {
    backgroundColor: '#007AFF',
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
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
  },
  emptySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  appointmentLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 16,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
