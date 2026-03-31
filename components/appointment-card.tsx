import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Shadows, Spacing } from '@/constants/theme';
import { Database } from '@/lib/database.types';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
});

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

type Appointment = Database['public']['Tables']['appointments']['Row'];

interface AppointmentCardProps {
    appointment: Appointment;
    onPress?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    /** If true, show full date + time instead of just time */
    showFullDate?: boolean;
}

export const AppointmentCard = memo(function AppointmentCard({
    appointment,
    onPress,
    onEdit,
    onDelete,
    showFullDate = false,
}: AppointmentCardProps) {
    const formatTime = (date: string) => timeFormatter.format(new Date(date));
    const formatFullDate = (date: string) => fullDateFormatter.format(new Date(date));

    const content = (
        <>
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
                        {appointment.appointment_type ? (
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeText}>{appointment.appointment_type}</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={styles.actions}>
                        {onEdit ? (
                            <Pressable onPress={onEdit} hitSlop={12} style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}>
                                <IconSymbol name="pencil" size={18} color={BrandColors.primary} />
                            </Pressable>
                        ) : null}
                        {onDelete ? (
                            <Pressable onPress={onDelete} hitSlop={12} style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}>
                                <IconSymbol name="trash" size={18} color="#FF3B30" />
                            </Pressable>
                        ) : null}
                    </View>
                </View>

                {/* Details section */}
                <View style={styles.details}>
                    {appointment.scheduled_at ? (
                        <View style={styles.detailRow}>
                            <IconSymbol name="clock" size={14} color={BrandColors.accent} />
                            <Text style={styles.timeText}>
                                {showFullDate
                                    ? formatFullDate(appointment.scheduled_at)
                                    : formatTime(appointment.scheduled_at)}
                            </Text>
                        </View>
                    ) : null}
                    {appointment.location ? (
                        <View style={styles.detailRow}>
                            <IconSymbol name="mappin" size={14} color={NeutralColors.gray400} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {appointment.location}
                            </Text>
                        </View>
                    ) : null}
                    {appointment.clinician_name ? (
                        <View style={styles.detailRow}>
                            <IconSymbol name="person" size={14} color={NeutralColors.gray400} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {appointment.clinician_name}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Notes */}
                {appointment.notes ? (
                    <Text style={styles.notes} numberOfLines={2}>
                        {appointment.notes}
                    </Text>
                ) : null}
            </View>
        </>
    );

    if (onPress) {
        return (
            <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} onPress={onPress}>
                {content}
            </Pressable>
        );
    }

    return <View style={styles.card}>{content}</View>;
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
