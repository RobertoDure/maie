import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService } from '@/lib/services';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type Cycle = Database['public']['Tables']['cycles']['Row'];
type CycleType = 'IVF' | 'IUI' | 'FET' | 'Timed';
type CycleStatus = 'planned' | 'active' | 'completed' | 'cancelled';

const CYCLE_TYPES: CycleType[] = ['IVF', 'IUI', 'FET', 'Timed'];
const CYCLE_STATUSES: { value: CycleStatus; label: string }[] = [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function EditCycleScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [cycleType, setCycleType] = useState<CycleType>('IVF');
    const [status, setStatus] = useState<CycleStatus>('planned');
    const [clinicName, setClinicName] = useState('');
    const [protocolName, setProtocolName] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        const loadCycle = async () => {
            if (!user || !id) return;
            try {
                const cycle = await CycleService.getCycle(user.id, id);
                if (cycle) {
                    setCycleType((cycle.cycle_type as CycleType) || 'IVF');
                    setStatus((cycle.status as CycleStatus) || 'planned');
                    setClinicName(cycle.clinic_name || '');
                    setProtocolName(cycle.protocol_name || '');
                    if (cycle.start_date) setStartDate(new Date(cycle.start_date));
                    if (cycle.end_date) setEndDate(new Date(cycle.end_date));
                }
            } catch (error: any) {
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        };
        loadCycle();
    }, [user, id]);

    const handleSave = async () => {
        if (!user || !id) return;

        setSaving(true);
        try {
            await CycleService.updateCycle(user.id, id, {
                cycle_type: cycleType,
                status: status,
                clinic_name: clinicName || null,
                protocol_name: protocolName || null,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate ? endDate.toISOString().split('T')[0] : null,
            });

            Alert.alert('Success', 'Cycle updated successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Cycle',
            'Are you sure you want to delete this cycle? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user || !id) return;
                        setDeleting(true);
                        try {
                            await CycleService.deleteCycle(user.id, id);
                            Alert.alert('Deleted', 'Cycle has been deleted.', [
                                {
                                    text: 'OK',
                                    onPress: () => router.replace('/(tabs)/explore'),
                                },
                            ]);
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Not set';
        return date.toLocaleDateString('en-US', {
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

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Cycle</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cycle Type</Text>
                    <View style={styles.optionsRow}>
                        {CYCLE_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.optionButton,
                                    cycleType === type && styles.optionButtonSelected,
                                ]}
                                onPress={() => setCycleType(type)}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        cycleType === type && styles.optionTextSelected,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <View style={styles.optionsRow}>
                        {CYCLE_STATUSES.map((s) => (
                            <TouchableOpacity
                                key={s.value}
                                style={[
                                    styles.optionButton,
                                    status === s.value && styles.optionButtonSelected,
                                ]}
                                onPress={() => setStatus(s.value)}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        status === s.value && styles.optionTextSelected,
                                    ]}
                                >
                                    {s.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Clinic Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter clinic name"
                        value={clinicName}
                        onChangeText={setClinicName}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Protocol Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter protocol name (optional)"
                        value={protocolName}
                        onChangeText={setProtocolName}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Start Date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                        <IconSymbol name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                                setShowStartPicker(Platform.OS === 'ios');
                                if (date) setStartDate(date);
                            }}
                        />
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>End Date (Optional)</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowEndPicker(true)}
                    >
                        <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                        <IconSymbol name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {showEndPicker && (
                        <DateTimePicker
                            value={endDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                                setShowEndPicker(Platform.OS === 'ios');
                                if (date) setEndDate(date);
                            }}
                        />
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
                    onPress={handleDelete}
                    disabled={deleting}
                >
                    <IconSymbol name="trash" size={18} color="#FF3B30" />
                    <Text style={styles.deleteButtonText}>
                        {deleting ? 'Deleting...' : 'Delete Cycle'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
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
    placeholder: {
        width: 40,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    optionButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    optionText: {
        fontSize: 14,
        color: '#333',
    },
    optionTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    dateButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FF3B30',
        backgroundColor: '#fff',
    },
    deleteButtonDisabled: {
        opacity: 0.5,
    },
    deleteButtonText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '600',
    },
});
