import { AppointmentCard } from '@/components/appointment-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { AppointmentService } from '@/lib/services/appointment.service';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Appointment = Database['public']['Tables']['appointments']['Row'];

export default function AppointmentsByDateScreen() {
    const { date } = useLocalSearchParams<{ date: string }>();
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const selectedDate = new Date(date || new Date().toISOString());

    const formattedDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    useEffect(() => {
        const loadAppointments = async () => {
            if (!user || !date) return;
            try {
                const data = await AppointmentService.getAppointmentsByDate(user.id, selectedDate);
                setAppointments(data);
            } catch (error) {
                console.error('Error loading appointments:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAppointments();
    }, [user, date]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color={BrandColors.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Appointments</Text>
                    <Text style={styles.headerSubtitle}>{formattedDate}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {appointments.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <IconSymbol name="calendar" size={64} color={NeutralColors.gray300} />
                        <Text style={styles.emptyText}>No appointments for this day</Text>
                    </View>
                ) : (
                    <FlatList
                        data={appointments}
                        renderItem={({ item }) => <AppointmentCard appointment={item} />}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                    />
                )}
            </View>
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
        borderBottomWidth: 1,
        borderBottomColor: NeutralColors.gray100,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: NeutralColors.gray900,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: NeutralColors.gray500,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: NeutralColors.gray400,
        marginTop: 16,
        fontWeight: '500',
    },
});
