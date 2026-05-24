import { AppointmentCard } from '@/components/appointment-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { AppointmentService } from '@/lib/services/appointment.service';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
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

    // Edit state — null means create mode, non-null means edit mode
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [appointmentType, setAppointmentType] = useState('');
    const [scheduledAt, setScheduledAt] = useState(new Date());
    const [location, setLocation] = useState('');
    const [clinicianName, setClinicianName] = useState('');
    const [notes, setNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    const isEditing = editingAppointment !== null;

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
        setEditingAppointment(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const openEditModal = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setTitle(appointment.title || '');
        setAppointmentType(appointment.appointment_type || '');
        setScheduledAt(appointment.scheduled_at ? new Date(appointment.scheduled_at) : new Date());
        setLocation(appointment.location || '');
        setClinicianName(appointment.clinician_name || '');
        setNotes(appointment.notes || '');
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        resetForm();
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

    const handleUpdate = async () => {
        if (!user || !editingAppointment) return;
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        setSaving(true);
        try {
            await AppointmentService.updateAppointment(user.id, editingAppointment.id, {
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

    const handleSave = isEditing ? handleUpdate : handleCreate;

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
        <AppointmentCard
            appointment={item}
            showFullDate
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDelete(item.id)}
        />
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color={BrandColors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Appointments</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={openCreateModal}
                >
                    <IconSymbol name="plus" size={24} color={BrandColors.primary} />
                </TouchableOpacity>
            </View>

            {appointments.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <IconSymbol name="calendar" size={64} color={NeutralColors.gray200} />
                    <Text style={styles.emptyText}>No appointments yet</Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={openCreateModal}
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

            {/* Create / Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={handleCloseModal}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {isEditing ? 'Edit Appointment' : 'New Appointment'}
                        </Text>
                        <TouchableOpacity onPress={handleSave} disabled={saving}>
                            <Text style={[styles.saveText, saving && styles.disabledText]}>
                                {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.form}
                        contentContainerStyle={styles.formContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        automaticallyAdjustKeyboardInsets
                    >
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Morning Ultrasound"
                            placeholderTextColor={NeutralColors.gray300}
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
                            <Text style={styles.dateButtonText}>
                                {formatDate(scheduledAt.toISOString())}
                            </Text>
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
                            placeholderTextColor={NeutralColors.gray300}
                            value={location}
                            onChangeText={setLocation}
                        />

                        <Text style={styles.label}>Clinician</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Doctor name"
                            placeholderTextColor={NeutralColors.gray300}
                            value={clinicianName}
                            onChangeText={setClinicianName}
                        />

                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={[styles.input, styles.notesInput]}
                            placeholder="Any additional notes"
                            placeholderTextColor={NeutralColors.gray300}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                        />
                    </ScrollView>
                </View>
            </Modal>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.xl,
        paddingTop: 60,
        backgroundColor: NeutralColors.white,
        borderBottomWidth: 1,
        borderBottomColor: NeutralColors.gray100,
    },
    backButton: {
        padding: Spacing.sm,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: NeutralColors.gray900,
    },
    addButton: {
        padding: Spacing.sm,
    },
    listContainer: {
        padding: Spacing.lg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xxxl,
    },
    emptyText: {
        fontSize: 18,
        color: NeutralColors.gray400,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xxl,
    },
    createButton: {
        backgroundColor: BrandColors.primary,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.md,
    },
    createButtonText: {
        color: NeutralColors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: NeutralColors.gray50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.xl,
        paddingTop: 60,
        backgroundColor: NeutralColors.white,
        borderBottomWidth: 1,
        borderBottomColor: NeutralColors.gray100,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: NeutralColors.gray900,
    },
    cancelText: {
        fontSize: 16,
        color: NeutralColors.gray400,
    },
    saveText: {
        fontSize: 16,
        color: BrandColors.primary,
        fontWeight: '600',
    },
    disabledText: {
        opacity: 0.5,
    },
    form: {
        padding: Spacing.xl,
    },
    formContent: {
        paddingBottom: 120,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: NeutralColors.gray900,
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
    },
    input: {
        backgroundColor: NeutralColors.white,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        fontSize: 16,
        borderWidth: 1,
        borderColor: NeutralColors.gray100,
        color: NeutralColors.gray900,
    },
    notesInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    typeButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.lg,
        backgroundColor: NeutralColors.white,
        borderWidth: 1,
        borderColor: NeutralColors.gray100,
    },
    typeButtonSelected: {
        backgroundColor: BrandColors.primary,
        borderColor: BrandColors.primary,
    },
    typeButtonText: {
        fontSize: 14,
        color: NeutralColors.gray900,
    },
    typeButtonTextSelected: {
        color: NeutralColors.white,
    },
    dateButton: {
        backgroundColor: NeutralColors.white,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: NeutralColors.gray100,
    },
    dateButtonText: {
        fontSize: 16,
        color: NeutralColors.gray900,
    },
});
