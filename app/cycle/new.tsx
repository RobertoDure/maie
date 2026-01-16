import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { CycleService } from '@/lib/services';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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

type CycleType = 'IVF' | 'IUI' | 'FET' | 'Timed';
type CycleStatus = 'planned' | 'active' | 'completed' | 'cancelled';

const CYCLE_TYPES: CycleType[] = ['IVF', 'IUI', 'FET', 'Timed'];
const CYCLE_STATUSES: { value: CycleStatus; label: string }[] = [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function NewCycleScreen() {
    const { user } = useAuth();
    const [cycleType, setCycleType] = useState<CycleType>('IVF');
    const [status, setStatus] = useState<CycleStatus>('planned');
    const [clinicName, setClinicName] = useState('');
    const [protocolName, setProtocolName] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!user) return;

        setLoading(true);
        try {
            await CycleService.createCycle(user.id, {
                cycle_type: cycleType,
                status: status,
                clinic_name: clinicName || null,
                protocol_name: protocolName || null,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate ? endDate.toISOString().split('T')[0] : null,
            });

            Alert.alert('Success', 'Cycle created successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Not set';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.title}>New Cycle</Text>
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
                    style={[styles.createButton, loading && styles.createButtonDisabled]}
                    onPress={handleCreate}
                    disabled={loading}
                >
                    <Text style={styles.createButtonText}>
                        {loading ? 'Creating...' : 'Create Cycle'}
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
    createButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
