import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, SemanticColors, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService, MedicationService } from '@/lib/services';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

    const loadCycleData = useCallback(async () => {
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
    }, [user, id]);

    useFocusEffect(
        useCallback(() => {
            loadCycleData();
        }, [loadCycleData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadCycleData();
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'active':
                return SemanticColors.success;
            case 'planned':
                return SemanticColors.info;
            case 'completed':
                return NeutralColors.gray300;
            case 'cancelled':
                return SemanticColors.error;
            default:
                return NeutralColors.gray300;
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
                <ActivityIndicator size="large" color={BrandColors.primary} />
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

    const statusColor = getStatusColor(cycle.status);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color={BrandColors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>{cycle.cycle_type || 'Cycle'}</Text>
                <TouchableOpacity
                    onPress={() => router.push(`/cycle/${id}/edit`)}
                    style={styles.editButton}
                >
                    <IconSymbol name="pencil" size={18} color={BrandColors.primary} />
                </TouchableOpacity>
                <View
                    style={[styles.statusBadge, { backgroundColor: statusColor }]}
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
                {/* Overview Card */}
                <View style={styles.card}>
                    <View style={[styles.cardAccent, { backgroundColor: BrandColors.primary }]} />
                    <View style={styles.cardBody}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.cardIconCircle, { backgroundColor: BrandColors.primary + '12' }]}>
                                <IconSymbol name="info.circle" size={20} color={BrandColors.primary} />
                            </View>
                            <Text style={styles.cardTitle}>Overview</Text>
                        </View>
                        <View style={styles.cardDetails}>
                            <View style={styles.infoRow}>
                                <IconSymbol name="building.2" size={16} color={NeutralColors.gray400} />
                                <Text style={styles.infoLabel}>Clinic</Text>
                                <Text style={styles.infoValue}>{cycle.clinic_name || 'Not specified'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <IconSymbol name="doc.text" size={16} color={NeutralColors.gray400} />
                                <Text style={styles.infoLabel}>Protocol</Text>
                                <Text style={styles.infoValue}>
                                    {cycle.protocol_name || 'Not specified'}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <IconSymbol name="calendar" size={16} color={NeutralColors.gray400} />
                                <Text style={styles.infoLabel}>Duration</Text>
                                <Text style={styles.infoValue}>
                                    {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Phase Timeline */}
                {phases.length > 0 && (
                    <View style={styles.card}>
                        <View style={[styles.cardAccent, { backgroundColor: BrandColors.accent }]} />
                        <View style={styles.cardBody}>
                            <View style={styles.cardTitleRow}>
                                <View style={[styles.cardIconCircle, { backgroundColor: BrandColors.accent + '12' }]}>
                                    <IconSymbol name="flag" size={20} color={BrandColors.accent} />
                                </View>
                                <Text style={styles.cardTitle}>Phases</Text>
                            </View>
                            <View style={styles.cardDetails}>
                                {phases.map((phase, index) => (
                                    <View key={phase.id} style={styles.phaseItem}>
                                        <View style={styles.phaseIndicator}>
                                            <View style={[styles.phaseDot, { backgroundColor: BrandColors.accent }]} />
                                            {index < phases.length - 1 && (
                                                <View style={[styles.phaseLine, { backgroundColor: BrandColors.accent + '40' }]} />
                                            )}
                                        </View>
                                        <View style={styles.phaseContent}>
                                            <Text style={styles.phaseName}>{phase.phase}</Text>
                                            <Text style={styles.phaseDate}>
                                                {formatDate(phase.start_date)} — {formatDate(phase.end_date)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/cycle/${id}/appointments`)}
                    >
                        <View style={[styles.actionAccent, { backgroundColor: SemanticColors.info }]} />
                        <View style={styles.actionBody}>
                            <View style={[styles.actionIconCircle, { backgroundColor: SemanticColors.infoLight }]}>
                                <IconSymbol name="calendar.badge.plus" size={22} color={SemanticColors.info} />
                            </View>
                            <Text style={styles.actionTitle}>Appointments</Text>
                            <Text style={styles.actionSubtitle}>Manage schedule</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        activeOpacity={0.7}
                        onPress={() => router.push('/(tabs)/medications')}
                    >
                        <View style={[styles.actionAccent, { backgroundColor: SemanticColors.warning }]} />
                        <View style={styles.actionBody}>
                            <View style={[styles.actionIconCircle, { backgroundColor: SemanticColors.warningLight }]}>
                                <IconSymbol name="pills" size={22} color={SemanticColors.warning} />
                            </View>
                            <Text style={styles.actionTitle}>Medications</Text>
                            <Text style={styles.actionSubtitle}>{medications.length} active</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/cycle/${id}/share`)}
                    >
                        <View style={[styles.actionAccent, { backgroundColor: SemanticColors.success }]} />
                        <View style={styles.actionBody}>
                            <View style={[styles.actionIconCircle, { backgroundColor: SemanticColors.successLight }]}>
                                <IconSymbol name="person.2" size={22} color={SemanticColors.success} />
                            </View>
                            <Text style={styles.actionTitle}>Share</Text>
                            <Text style={styles.actionSubtitle}>Partner access</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        activeOpacity={0.7}
                        onPress={() => router.push('/(tabs)/mood')}
                    >
                        <View style={[styles.actionAccent, { backgroundColor: SemanticColors.error }]} />
                        <View style={styles.actionBody}>
                            <View style={[styles.actionIconCircle, { backgroundColor: SemanticColors.errorLight }]}>
                                <IconSymbol name="heart" size={22} color={SemanticColors.error} />
                            </View>
                            <Text style={styles.actionTitle}>Mood</Text>
                            <Text style={styles.actionSubtitle}>Check-in</Text>
                        </View>
                    </TouchableOpacity>
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
        alignItems: 'center',
        padding: Spacing.xl,
        paddingTop: 60,
        backgroundColor: NeutralColors.white,
        borderBottomWidth: 1,
        borderBottomColor: NeutralColors.gray100,
        gap: Spacing.md,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: BrandColors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: BrandColors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
        color: NeutralColors.gray900,
    },
    statusBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
    },
    statusText: {
        color: NeutralColors.white,
        fontSize: 11,
        fontWeight: '600',
    },
    content: {
        padding: Spacing.lg,
    },
    // Card shared structure
    card: {
        flexDirection: 'row',
        backgroundColor: NeutralColors.white,
        borderRadius: Radius.md,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
        ...Shadows.md,
    },
    cardAccent: {
        width: 4,
        borderTopLeftRadius: Radius.md,
        borderBottomLeftRadius: Radius.md,
    },
    cardBody: {
        flex: 1,
        padding: Spacing.lg,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    cardIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: NeutralColors.gray900,
    },
    cardDetails: {
        gap: 0,
    },
    // Info rows
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: NeutralColors.gray100,
    },
    infoLabel: {
        flex: 1,
        fontSize: 14,
        color: NeutralColors.gray400,
        marginLeft: Spacing.md,
    },
    infoValue: {
        fontSize: 14,
        color: NeutralColors.gray900,
        fontWeight: '500',
    },
    // Phase timeline
    phaseItem: {
        flexDirection: 'row',
        minHeight: 56,
    },
    phaseIndicator: {
        width: Spacing.xxl,
        alignItems: 'center',
    },
    phaseDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    phaseLine: {
        flex: 1,
        width: 2,
        marginVertical: Spacing.xs,
    },
    phaseContent: {
        flex: 1,
        paddingLeft: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    phaseName: {
        fontSize: 15,
        fontWeight: '600',
        color: NeutralColors.gray900,
    },
    phaseDate: {
        fontSize: 13,
        color: NeutralColors.gray400,
        marginTop: Spacing.xs,
    },
    // Section title
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: NeutralColors.gray900,
        marginBottom: Spacing.md,
        marginTop: Spacing.sm,
    },
    // Quick action cards
    actionsContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    actionCard: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: NeutralColors.white,
        borderRadius: Radius.md,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    actionAccent: {
        width: 4,
        borderTopLeftRadius: Radius.md,
        borderBottomLeftRadius: Radius.md,
    },
    actionBody: {
        flex: 1,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: NeutralColors.gray900,
        marginTop: Spacing.xs,
    },
    actionSubtitle: {
        fontSize: 12,
        color: NeutralColors.gray400,
        marginTop: 2,
    },
});
