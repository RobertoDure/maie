import { IconSymbol } from '@/components/ui/icon-symbol';
import { Database } from '@/lib/database.types';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Medication = Database['public']['Tables']['medications']['Row'];
type MedicationDosage = Database['public']['Tables']['medication_dosages']['Row'];

interface MedicationCardProps {
    medication: Medication & { medication_dosages?: MedicationDosage[] };
    onConfirmDose?: (dosageId: string) => void;
    onPress?: () => void;
    onEdit?: () => void;
    confirmedDosageIds?: string[];
}

export function MedicationCard({
    medication,
    onConfirmDose,
    onPress,
    onEdit,
    confirmedDosageIds = [],
}: MedicationCardProps) {
    const dosages = medication.medication_dosages || [];
    const nextDosage = dosages[0];
    const isTaken = nextDosage && confirmedDosageIds.includes(nextDosage.id);

    const handleConfirm = () => {
        if (nextDosage && onConfirmDose && !isTaken) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onConfirmDose(nextDosage.id);
        }
    };

    const formatTime = (time: string | null) => {
        if (!time) return 'No time set';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getRouteIcon = (route: string | null) => {
        switch (route?.toLowerCase()) {
            case 'injection':
                return 'syringe';
            case 'oral':
                return 'pills';
            case 'vaginal':
                return 'oval';
            case 'patch':
                return 'bandage';
            default:
                return 'pills';
        }
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <IconSymbol
                        name={getRouteIcon(medication.route)}
                        size={24}
                        color="#FF9500"
                    />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.name}>{medication.name}</Text>
                    {medication.route && (
                        <Text style={styles.route}>{medication.route}</Text>
                    )}
                </View>
            </View>

            {onEdit && (
                <TouchableOpacity onPress={onEdit} hitSlop={12} style={styles.editButton}>
                    <IconSymbol name="pencil" size={20} color="#007AFF" />
                </TouchableOpacity>
            )}

            {medication.purpose && (
                <Text style={styles.purpose}>{medication.purpose}</Text>
            )}

            {dosages.length > 0 && (
                <View style={styles.dosageSection}>
                    <Text style={styles.dosageLabel}>Dosages:</Text>
                    {dosages.slice(0, 3).map((dosage) => (
                        <View key={dosage.id} style={styles.dosageRow}>
                            <Text style={styles.dosageAmount}>
                                {dosage.dosage_amount} {dosage.dosage_unit}
                            </Text>
                            <Text style={styles.dosageTime}>
                                {formatTime(dosage.time_of_day)}
                            </Text>
                        </View>
                    ))}
                    {dosages.length > 3 && (
                        <Text style={styles.moreText}>+{dosages.length - 3} more</Text>
                    )}
                </View>
            )}

            {nextDosage && onConfirmDose && (
                <TouchableOpacity
                    style={[styles.confirmButton, isTaken && styles.confirmButtonTaken]}
                    onPress={handleConfirm}
                    disabled={isTaken}
                    activeOpacity={0.8}
                >
                    <IconSymbol
                        name={isTaken ? "checkmark.circle.fill" : "checkmark"}
                        size={18}
                        color={isTaken ? "#34C759" : "#fff"}
                    />
                    <Text style={[styles.confirmText, isTaken && styles.confirmTextTaken]}>
                        {isTaken ? 'Taken Today' : 'Confirm Dose'}
                    </Text>
                </TouchableOpacity>
            )}

            {medication.instructions && (
                <View style={styles.instructionsSection}>
                    <IconSymbol name="info.circle" size={14} color="#666" />
                    <Text style={styles.instructions}>{medication.instructions}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    route: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    purpose: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    dosageSection: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    dosageLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    dosageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    dosageAmount: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    dosageTime: {
        fontSize: 14,
        color: '#007AFF',
    },
    moreText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#34C759',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        marginBottom: 12,
    },
    confirmButtonTaken: {
        backgroundColor: '#F2F2F7',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    confirmText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmTextTaken: {
        color: '#34C759',
    },
    instructionsSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    instructions: {
        flex: 1,
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    editButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
});
