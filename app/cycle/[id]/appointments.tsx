import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { AppointmentService } from '@/lib/services/appointment.service';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type Appointment = Database['public']['Tables']['appointments']['Row'];

const APPOINTMENT_TYPES = [
    'Ultrasound',
    'Blood Work',
    'Retrieval',
    'Transfer',
    'Follow-up',
    'Consultation',
    'Other',
];

export default function AppointmentsScreen() {
    const { id: cycleId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [appointmentType, setAppointmentType] = useState('');
    const [scheduledAt, setScheduledAt] = useState(new Date());
    const [location, setLocation] = useState('');
    const [clinicianName, setClinicianName] = useState('');
    const [notes, setNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || scheduledAt;
        if (Platform.OS === 'ios') {
            setShowDatePicker(false);
        }
        setScheduledAt(currentDate);
    };

    const showMode = (currentMode: 'date' | 'time') => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: scheduledAt,
                onChange: onDateChange,
                mode: currentMode,
                is24Hour: true,
            });
        } else {
            setShowDatePicker(true);
        }
    };

    const loadAppointments = async () => {
        if (!user || !cycleId) return;

        try {
            const data = await AppointmentService.getAppointments(user.id, cycleId);
            setAppointments(data);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAppointments();
    }, [user, cycleId]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAppointments();
    };

    const resetForm = () => {
        setTitle('');
        setAppointmentType('');
        setScheduledAt(new Date());
        setLocation('');
        setClinicianName('');
        setNotes('');
    };

    const handleCreate = async () => {
        if (!user || !cycleId) return;
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        setSaving(true);
        try {
            await AppointmentService.createAppointment(user.id, cycleId, {
                title: title.trim(),
                appointment_type: appointmentType || null,
                scheduled_at: scheduledAt.toISOString(),
                location: location || null,
                clinician_name: clinicianName || null,
                notes: notes || null,
            });

            setModalVisible(false);
            resetForm();
            loadAppointments();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (appointmentId: string) => {
        if (!user) return;

        Alert.alert('Delete Appointment', 'Are you sure you want to delete this appointment?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await AppointmentService.deleteAppointment(user.id, appointmentId);
                        loadAppointments();
                    } catch (error: any) {
                        Alert.alert('Error', error.message);
                    }
                },
            },
        ]);
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

    const renderAppointment = ({ item }: { item: Appointment }) => (
        <View style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
                <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTitle}>{item.title}</Text>
                    {item.appointment_type && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{item.appointment_type}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <IconSymbol name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
            </View>
            <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                    <IconSymbol name="calendar" size={16} color="#666" />
                    <Text style={styles.detailText}>{formatDate(item.scheduled_at!)}</Text>
                </View>
                {item.location && (
                    <View style={styles.detailRow}>
                        <IconSymbol name="mappin" size={16} color="#666" />
                        <Text style={styles.detailText}>{item.location}</Text>
                    </View>
                )}
                {item.clinician_name && (
                    <View style={styles.detailRow}>
                        <IconSymbol name="person" size={16} color="#666" />
                        <Text style={styles.detailText}>{item.clinician_name}</Text>
                    </View>
                )}
            </View>
            {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        </View>
    );

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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Appointments</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                >
                    <IconSymbol name="plus" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {appointments.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <IconSymbol name="calendar" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No appointments yet</Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.createButtonText}>Add Appointment</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={appointments}
                    renderItem={renderAppointment}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}

            {/* Add Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>New Appointment</Text>
                        <TouchableOpacity onPress={handleCreate} disabled={saving}>
                            <Text style={[styles.saveText, saving && styles.disabledText]}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Morning Ultrasound"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>Type</Text>
                        <View style={styles.typeRow}>
                            {APPOINTMENT_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.typeButton,
                                        appointmentType === type && styles.typeButtonSelected,
                                    ]}
                                    onPress={() => setAppointmentType(type)}
                                >
                                    <Text
                                        style={[
                                            styles.typeButtonText,
                                            appointmentType === type && styles.typeButtonTextSelected,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Date & Time</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => showMode('date')}
                        >
                            <Text>{formatDate(scheduledAt.toISOString())}</Text>
                        </TouchableOpacity>
                        {showDatePicker && Platform.OS === 'ios' && (
                            <DateTimePicker
                                value={scheduledAt}
                                mode="datetime"
                                display="default"
                                onChange={(event, date) => {
                                    setShowDatePicker(false);
                                    if (date) setScheduledAt(date);
                                }}
                            />
                        )}

                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Clinic address"
                            value={location}
                            onChangeText={setLocation}
                        />

                        <Text style={styles.label}>Clinician</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Doctor name"
                            value={clinicianName}
                            onChangeText={setClinicianName}
                        />

                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={[styles.input, styles.notesInput]}
                            placeholder="Any additional notes"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                        />
                    </View>
                </View >
            </Modal >
        </View >
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
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    addButton: {
        padding: 8,
    },
    listContainer: {
        padding: 16,
    },
    appointmentCard: {
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
    appointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    appointmentInfo: {
        flex: 1,
    },
    appointmentTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    typeBadge: {
        backgroundColor: '#E3F2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    typeText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    appointmentDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
    },
    notes: {
        fontSize: 14,
        color: '#666',
        marginTop: 12,
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginTop: 16,
        marginBottom: 24,
    },
    createButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    cancelText: {
        fontSize: 16,
        color: '#666',
    },
    saveText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    disabledText: {
        opacity: 0.5,
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    notesInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    typeButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    typeButtonText: {
        fontSize: 14,
        color: '#333',
    },
    typeButtonTextSelected: {
        color: '#fff',
    },
    dateButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
});
