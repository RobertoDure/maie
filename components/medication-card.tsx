import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, SemanticColors, Shadows, Spacing } from '@/constants/theme';
import { Database } from '@/lib/database.types';
import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
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

export const MedicationCard = memo(function MedicationCard({
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
        <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            onPress={onPress}
        >
            {/* Left accent border */}
            <View style={styles.accentBorder} />

            <View style={styles.content}>
                {/* Header row: icon + name + actions */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <IconSymbol
                            name={getRouteIcon(medication.route)}
                            size={20}
                            color={SemanticColors.warning}
                        />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.name} numberOfLines={1}>{medication.name}</Text>
                        {medication.route ? (
                            <View style={styles.routeBadge}>
                                <Text style={styles.routeText}>{medication.route}</Text>
                            </View>
                        ) : null}
                    </View>
                    {/* <View style={styles.actions}>
                        {onEdit && (
                            <TouchableOpacity onPress={onEdit} hitSlop={12} style={styles.actionButton}>
                                <IconSymbol name="pencil" size={18} color={BrandColors.primary} />
                            </TouchableOpacity>
                        )}
                    </View> */}
                </View>

                {/* Purpose */}
                {medication.purpose ? (
                    <View style={styles.detailRow}>
                        <IconSymbol name="info.circle" size={14} color={NeutralColors.gray400} />
                        <Text style={styles.detailText} numberOfLines={2}>{medication.purpose}</Text>
                    </View>
                ) : null}

                {/* Dosages */}
                {dosages.length > 0 && (
                    <View style={styles.dosageSection}>
                        <Text style={styles.dosageLabel}>Dosages</Text>
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

                {/* Confirm dose button */}
                {nextDosage && onConfirmDose ? (
                    <Pressable
                        style={({ pressed }) => [styles.confirmButton, isTaken && styles.confirmButtonTaken, pressed && !isTaken && { opacity: 0.8 }]}
                        onPress={handleConfirm}
                        disabled={isTaken}
                    >
                        <IconSymbol
                            name={isTaken ? "checkmark.circle.fill" : "checkmark"}
                            size={18}
                            color={isTaken ? SemanticColors.success : NeutralColors.white}
                        />
                        <Text style={[styles.confirmText, isTaken && styles.confirmTextTaken]}>
                            {isTaken ? 'Taken Today' : 'Confirm Dose'}
                        </Text>
                    </Pressable>
                ) : null}

                {/* Instructions */}
                {medication.instructions ? (
                    <View style={styles.instructionsRow}>
                        <IconSymbol name="info.circle" size={14} color={NeutralColors.gray400} />
                        <Text style={styles.instructions} numberOfLines={2}>{medication.instructions}</Text>
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: NeutralColors.white,
        borderRadius: Radius.md,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        ...Shadows.md,
    },
    accentBorder: {
        width: 4,
        backgroundColor: SemanticColors.warning,
        borderTopLeftRadius: Radius.md,
        borderBottomLeftRadius: Radius.md,
    },
    content: {
        flex: 1,
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: Radius.xl,
        backgroundColor: SemanticColors.warningLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    headerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: NeutralColors.gray900,
        marginBottom: 2,
    },
    routeBadge: {
        backgroundColor: SemanticColors.warning + '15',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        alignSelf: 'flex-start',
    },
    routeText: {
        fontSize: 12,
        color: SemanticColors.warning,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginLeft: Spacing.sm,
    },
    actionButton: {
        padding: Spacing.xs,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    detailText: {
        flex: 1,
        fontSize: 13,
        color: NeutralColors.gray400,
    },
    dosageSection: {
        backgroundColor: NeutralColors.gray50,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    dosageLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: NeutralColors.gray400,
        marginBottom: Spacing.sm,
    },
    dosageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    dosageAmount: {
        fontSize: 14,
        color: NeutralColors.gray900,
        fontWeight: '500',
    },
    dosageTime: {
        fontSize: 14,
        fontWeight: '500',
        color: BrandColors.accent,
    },
    moreText: {
        fontSize: 12,
        color: NeutralColors.gray400,
        marginTop: Spacing.xs,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SemanticColors.success,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    confirmButtonTaken: {
        backgroundColor: NeutralColors.gray50,
        borderWidth: 1,
        borderColor: NeutralColors.gray100,
    },
    confirmText: {
        color: NeutralColors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    confirmTextTaken: {
        color: SemanticColors.success,
    },
    instructionsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    instructions: {
        flex: 1,
        fontSize: 12,
        color: NeutralColors.gray400,
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
