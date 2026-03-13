import { BrandColors, NeutralColors, SemanticColors, Shadows } from '@/constants/theme';
import React, { useMemo } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

interface CalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    markedDates?: string[]; // Array of date strings (YYYY-MM-DD) that have activities
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function Calendar({
    selectedDate,
    onSelectDate,
    currentMonth,
    onMonthChange,
    markedDates = [],
}: CalendarProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatDateKey = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
        // We want Monday as first day, so adjust
        let startDayOfWeek = firstDay.getDay() - 1;
        if (startDayOfWeek < 0) startDayOfWeek = 6;

        const days: (Date | null)[] = [];

        // Add empty cells for days before the first day of month
        for (let i = 0; i < startDayOfWeek; i++) {
            const prevDate = new Date(year, month, 1 - (startDayOfWeek - i));
            days.push(prevDate);
        }

        // Add all days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push(new Date(year, month, day));
        }

        // Fill remaining cells to complete the grid (6 rows x 7 days = 42)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push(new Date(year, month + 1, i));
        }

        return days;
    }, [currentMonth]);

    const goToPreviousMonth = () => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        onMonthChange(newDate);
    };

    const goToNextMonth = () => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        onMonthChange(newDate);
    };

    const isCurrentMonth = (date: Date): boolean => {
        return date.getMonth() === currentMonth.getMonth();
    };

    const isToday = (date: Date): boolean => {
        return formatDateKey(date) === formatDateKey(today);
    };

    const isSelected = (date: Date): boolean => {
        return formatDateKey(date) === formatDateKey(selectedDate);
    };

    const hasActivity = (date: Date): boolean => {
        return markedDates.includes(formatDateKey(date));
    };

    return (
        <View style={styles.container}>
            {/* Month Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                    <IconSymbol name="chevron.left" size={20} color={NeutralColors.gray500} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <IconSymbol name="chevron.right" size={20} color={NeutralColors.gray500} />
                </TouchableOpacity>
            </View>

            {/* Day Labels */}
            <View style={styles.weekDaysRow}>
                {DAYS_OF_WEEK.map((day) => (
                    <View key={day} style={styles.weekDayCell}>
                        <Text style={styles.weekDayText}>{day}</Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.daysGrid}>
                {calendarDays.map((date, index) => {
                    if (!date) return <View key={index} style={styles.dayCell} />;

                    const inCurrentMonth = isCurrentMonth(date);
                    const todayDate = isToday(date);
                    const selectedDay = isSelected(date);
                    const hasMarker = hasActivity(date);

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCell,
                                selectedDay && styles.selectedDayCell,
                            ]}
                            onPress={() => onSelectDate(date)}
                        >
                            <View style={[
                                styles.dayContent,
                                todayDate && styles.todayContent,
                            ]}>
                                <Text
                                    style={[
                                        styles.dayText,
                                        !inCurrentMonth && styles.dayTextOutside,
                                        todayDate && styles.todayText,
                                        selectedDay && styles.selectedDayText,
                                    ]}
                                >
                                    {date.getDate()}
                                </Text>
                                {hasMarker && (
                                    <View style={[
                                        styles.activityDot,
                                        todayDate && styles.activityDotToday,
                                    ]} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: NeutralColors.white,
        borderRadius: 16,
        padding: 16,
        ...Shadows.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    navButton: {
        padding: 8,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: NeutralColors.gray900,
    },
    weekDaysRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekDayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekDayText: {
        fontSize: 14,
        fontWeight: '500',
        color: NeutralColors.gray400,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', // 100% / 7 days
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    selectedDayCell: {
        borderWidth: 2,
        borderColor: BrandColors.accent,
        borderRadius: 8,
    },
    dayContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    todayContent: {
        backgroundColor: BrandColors.primary,
    },
    dayText: {
        fontSize: 16,
        fontWeight: '500',
        color: NeutralColors.gray900,
    },
    dayTextOutside: {
        color: NeutralColors.gray300,
    },
    todayText: {
        color: NeutralColors.white,
    },
    selectedDayText: {
        color: BrandColors.accent,
        fontWeight: '700',
    },
    activityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: SemanticColors.error,
        position: 'absolute',
        bottom: 4,
    },
    activityDotToday: {
        backgroundColor: NeutralColors.white,
    },
});
