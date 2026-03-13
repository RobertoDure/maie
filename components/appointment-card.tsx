import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Shadows, Spacing } from '@/constants/theme';
import { Database } from '@/lib/database.types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Appointment = Database['public']['Tables']['appointments']['Row'];

interface AppointmentCardProps {
    appointment: Appointment;
    onPress?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    /** If true, show full date + time instead of just time */
    showFullDate?: boolean;
}

export function AppointmentCard({
    appointment,
    onPress,
    onEdit,
    onDelete,
    showFullDate = false,
}: AppointmentCardProps) {
    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatFullDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const Wrapper = onPress ? TouchableOpacity : View;
    const wrapperProps = onPress
        ? { onPress, activeOpacity: 0.7 }
        : {};

    return (
        <Wrapper style={styles.card} {...(wrapperProps as any)}>
            {/* Left accent border */}
            <View style={styles.accentBorder} />

            <View style={styles.content}>
                {/* Header row: icon + title + actions */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <IconSymbol name="calendar" size={20} color={BrandColors.primary} />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title} numberOfLines={1}>
                            {appointment.title || 'Appointment'}
                        </Text>
                        {appointment.appointment_type && (
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeText}>{appointment.appointment_type}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.actions}>
                        {onEdit && (
                            <TouchableOpacity onPress={onEdit} hitSlop={12} style={styles.actionButton}>
                                <IconSymbol name="pencil" size={18} color={BrandColors.primary} />
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity onPress={onDelete} hitSlop={12} style={styles.actionButton}>
                                <IconSymbol name="trash" size={18} color="#FF3B30" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Details section */}
                <View style={styles.details}>
                    {appointment.scheduled_at && (
                        <View style={styles.detailRow}>
                            <IconSymbol name="clock" size={14} color={BrandColors.accent} />
                            <Text style={styles.timeText}>
                                {showFullDate
                                    ? formatFullDate(appointment.scheduled_at)
                                    : formatTime(appointment.scheduled_at)}
                            </Text>
                        </View>
                    )}
                    {appointment.location && (
                        <View style={styles.detailRow}>
                            <IconSymbol name="mappin" size={14} color={NeutralColors.gray400} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {appointment.location}
                            </Text>
                        </View>
                    )}
                    {appointment.clinician_name && (
                        <View style={styles.detailRow}>
                            <IconSymbol name="person" size={14} color={NeutralColors.gray400} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {appointment.clinician_name}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Notes */}
                {appointment.notes && (
                    <Text style={styles.notes} numberOfLines={2}>
                        {appointment.notes}
                    </Text>
                )}
            </View>
        </Wrapper>
    );
}

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
        backgroundColor: BrandColors.primary,
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
        backgroundColor: BrandColors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: NeutralColors.gray900,
        marginBottom: 2,
    },
    typeBadge: {
        backgroundColor: BrandColors.primary + '15',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        alignSelf: 'flex-start',
    },
    typeText: {
        fontSize: 12,
        color: BrandColors.primary,
        fontWeight: '500',
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
    details: {
        marginTop: Spacing.md,
        gap: Spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '500',
        color: BrandColors.accent,
    },
    detailText: {
        fontSize: 13,
        color: NeutralColors.gray400,
    },
    notes: {
        fontSize: 13,
        color: NeutralColors.gray400,
        marginTop: Spacing.sm,
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
