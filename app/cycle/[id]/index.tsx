import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService, MedicationService } from '@/lib/services';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Cycle = Database['public']['Tables']['cycles']['Row'];
type CyclePhase = Database['public']['Tables']['cycle_phases']['Row'];
type Medication = Database['public']['Tables']['medications']['Row'];

export default function CycleDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [cycle, setCycle] = useState<Cycle | null>(null);
    const [phases, setPhases] = useState<CyclePhase[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadCycleData = async () => {
        if (!user || !id) return;

        try {
            const [cycleData, phasesData, medsData] = await Promise.all([
                CycleService.getCycle(user.id, id),
                CycleService.getCyclePhases(user.id, id),
                MedicationService.getMedications(user.id, id),
            ]);

            setCycle(cycleData);
            setPhases(phasesData);
            setMedications(medsData as any);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCycleData();
    }, [user, id]);

    const onRefresh = () => {
        setRefreshing(true);
        loadCycleData();
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'active':
                return '#34C759';
            case 'planned':
                return '#007AFF';
            case 'completed':
                return '#8E8E93';
            case 'cancelled':
                return '#FF3B30';
            default:
                return '#8E8E93';
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'Not set';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!cycle) {
        return (
            <View style={styles.centerContainer}>
                <Text>Cycle not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.title}>{cycle.cycle_type || 'Cycle'}</Text>
                <View
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(cycle.status) }]}
                >
                    <Text style={styles.statusText}>{cycle.status?.toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Cycle Info Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Overview</Text>
                    <View style={styles.infoRow}>
                        <IconSymbol name="building.2" size={18} color="#666" />
                        <Text style={styles.infoLabel}>Clinic</Text>
                        <Text style={styles.infoValue}>{cycle.clinic_name || 'Not specified'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <IconSymbol name="doc.text" size={18} color="#666" />
                        <Text style={styles.infoLabel}>Protocol</Text>
                        <Text style={styles.infoValue}>
                            {cycle.protocol_name || 'Not specified'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <IconSymbol name="calendar" size={18} color="#666" />
                        <Text style={styles.infoLabel}>Duration</Text>
                        <Text style={styles.infoValue}>
                            {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
                        </Text>
                    </View>
                </View>

                {/* Phase Timeline */}
                {phases.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Phases</Text>
                        {phases.map((phase, index) => (
                            <View key={phase.id} style={styles.phaseItem}>
                                <View style={styles.phaseIndicator}>
                                    <View style={styles.phaseDot} />
                                    {index < phases.length - 1 && <View style={styles.phaseLine} />}
                                </View>
                                <View style={styles.phaseContent}>
                                    <Text style={styles.phaseName}>{phase.phase}</Text>
                                    <Text style={styles.phaseDate}>
                                        {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push(`/cycle/${id}/appointments`)}
                    >
                        <IconSymbol name="calendar.badge.plus" size={32} color="#007AFF" />
                        <Text style={styles.actionTitle}>Appointments</Text>
                        <Text style={styles.actionSubtitle}>Manage schedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(tabs)/medications')}
                    >
                        <IconSymbol name="pills" size={32} color="#FF9500" />
                        <Text style={styles.actionTitle}>Medications</Text>
                        <Text style={styles.actionSubtitle}>{medications.length} active</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push(`/cycle/${id}/share`)}
                    >
                        <IconSymbol name="person.2" size={32} color="#34C759" />
                        <Text style={styles.actionTitle}>Share</Text>
                        <Text style={styles.actionSubtitle}>Partner access</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(tabs)/mood')}
                    >
                        <IconSymbol name="heart" size={32} color="#FF2D55" />
                        <Text style={styles.actionTitle}>Mood</Text>
                        <Text style={styles.actionSubtitle}>Check-in</Text>
                    </TouchableOpacity>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        gap: 12,
    },
    backButton: {
        padding: 8,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        marginLeft: 12,
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    phaseItem: {
        flexDirection: 'row',
        minHeight: 60,
    },
    phaseIndicator: {
        width: 24,
        alignItems: 'center',
    },
    phaseDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
    },
    phaseLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#007AFF',
        marginVertical: 4,
    },
    phaseContent: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 16,
    },
    phaseName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    phaseDate: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    actionCard: {
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
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        color: '#333',
    },
    actionSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
});
