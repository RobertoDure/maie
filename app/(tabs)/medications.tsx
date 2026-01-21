import { MedicationCard } from '@/components/medication-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService } from '@/lib/services/cycle.service';
import { MedicationService } from '@/lib/services/medication.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

type Cycle = Database['public']['Tables']['cycles']['Row'];
type Medication = Database['public']['Tables']['medications']['Row'];
type MedicationDosage = Database['public']['Tables']['medication_dosages']['Row'];

interface MedicationWithDosages extends Medication {
  medication_dosages: MedicationDosage[];
}

const ROUTES = ['Injection', 'Oral', 'Vaginal', 'Patch', 'Other'];
const UNITS = ['mg', 'iu', 'mcg', 'ml', 'tablet'];

export default function MedicationsScreen() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [medications, setMedications] = useState<MedicationWithDosages[]>([]);
  const [confirmedDosageIds, setConfirmedDosageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [editingDosageId, setEditingDosageId] = useState<string | null>(null);

  // View/Edit Mode State
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');
  const [viewingMedication, setViewingMedication] = useState<MedicationWithDosages | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [route, setRoute] = useState('');
  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dosageAmount, setDosageAmount] = useState('');
  const [dosageUnit, setDosageUnit] = useState('mg');
  const [dosageTime, setDosageTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper for icons (duplicate from card for now or should be shared utility)
  const getRouteIcon = (route: string | null) => {
    switch (route?.toLowerCase()) {
      case 'injection': return 'syringe';
      case 'oral': return 'pills';
      case 'vaginal': return 'oval';
      case 'patch': return 'bandage';
      default: return 'pills';
    }
  };

  const loadCycles = async () => {
    if (!user) return;

    try {
      const data = await CycleService.getCycles(user.id);
      setCycles(data);
      if (data.length > 0 && !selectedCycle) {
        setSelectedCycle(data.find((c) => c.status === 'active') || data[0]);
      }
    } catch (error: any) {
      console.error('Error loading cycles:', error);
    }
  };

  const loadMedications = async () => {
    if (!user || !selectedCycle) {
      setLoading(false);
      return;
    }

    try {
      const [medsData, eventsData] = await Promise.all([
        MedicationService.getMedications(user.id, selectedCycle.id),
        MedicationService.getDailyEvents(user.id, selectedCycle.id, new Date()),
      ]);

      setMedications(medsData as MedicationWithDosages[]);

      // Extract dosage IDs from events that are 'taken'
      const takenDosageIds = eventsData
        .filter(event => event.status === 'taken')
        .map(event => event.dosage_id)
        .filter((id): id is string => id !== null);

      setConfirmedDosageIds(takenDosageIds);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, [user]);

  useEffect(() => {
    if (selectedCycle) {
      loadMedications();
    }
  }, [selectedCycle]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMedications();
  };

  const resetForm = () => {
    setName('');
    setRoute('');
    setPurpose('');
    setInstructions('');
    setDosageAmount('');
    setDosageUnit('mg');
    setDosageTime(new Date());
    setShowDatePicker(false);
    setEditingMedicationId(null);
    setEditingDosageId(null);
    setMode('create');
    setViewingMedication(null);
  };

  const handleAdd = () => {
    resetForm();
    setMode('create');
    setModalVisible(true);
  };

  const handleView = (medication: MedicationWithDosages) => {
    setViewingMedication(medication);
    setMode('view');
    setModalVisible(true);
  };

  const handleEdit = (medication: MedicationWithDosages) => {
    setMode('edit');
    setName(medication.name || '');
    setRoute(medication.route || '');
    setPurpose(medication.purpose || '');
    setInstructions(medication.instructions || '');

    // For MVP, we presume one dosage per medication or take the first one
    const dosage = medication.medication_dosages?.[0];
    if (dosage) {
      setEditingDosageId(dosage.id);
      setDosageAmount(dosage.dosage_amount?.toString() || '');
      setDosageUnit(dosage.dosage_unit || 'mg');

      if (dosage.time_of_day) {
        const [hours, minutes] = dosage.time_of_day.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        setDosageTime(date);
      }
    }

    setEditingMedicationId(medication.id);
    // setModalVisible(true); // Already visible if coming from View
  };

  const handleSave = async () => {
    if (!user || !selectedCycle) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a medication name');
      return;
    }

    setSaving(true);
    try {
      let medicationId = editingMedicationId;

      if (editingMedicationId) {
        // Update existing medication
        await MedicationService.updateMedication(user.id, editingMedicationId, {
          name: name.trim(),
          route: route || null,
          purpose: purpose || null,
          instructions: instructions || null,
        });
      } else {
        // Create new medication
        const newMedication = await MedicationService.createMedication(user.id, selectedCycle.id, {
          name: name.trim(),
          route: route || null,
          purpose: purpose || null,
          instructions: instructions || null,
          start_date: null,
          end_date: null,
        });
        medicationId = newMedication.id;
      }

      // Handle Dosage
      const timeString = dosageTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      if (editingDosageId) {
        // Update existing dosage
        await MedicationService.updateDosage(user.id, editingDosageId, {
          dosage_amount: dosageAmount.trim() ? parseFloat(dosageAmount) : null,
          dosage_unit: dosageUnit,
          time_of_day: timeString,
        });
      } else if (medicationId && dosageAmount.trim()) {
        // Create new dosage
        await MedicationService.addDosage(user.id, medicationId, {
          dosage_amount: parseFloat(dosageAmount),
          dosage_unit: dosageUnit,
          time_of_day: timeString,
          frequency: 'Daily',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await loadMedications();

      if (mode === 'edit' && editingMedicationId) {
        // If editing, return to view mode with updated data
        // We need to find the updated medication from the list we just reloaded
        // Since setMedications is async/batch, we might rely on re-fetching or manually updating local state for instant feedback.
        // For simplicity, we just close or we can try to find it.
        // Let's re-fetch individual medication or find in the new list.
        // But loadMedications sets state which isn't immediate in this scope.
        // Let's just fetch updated list and find it.
        // ACTUALLY, loadMedications await is above. so medications state will be updated... wait, no, setState is not awaitable like that to read back immediately without a ref.
        // Easier: Just close for now OR switch to view mode and hopefully user sees updated data next time or we optimistically update viewingMedication
        const updatedMedication = await MedicationService.getMedications(user.id, selectedCycle.id).then(meds => meds.find(m => m.id === editingMedicationId));
        if (updatedMedication) {
          setViewingMedication(updatedMedication as MedicationWithDosages);
          setMode('view');
        } else {
          setModalVisible(false);
          resetForm();
        }
      } else {
        setModalVisible(false);
        resetForm();
      }

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDose = async (dosageId: string) => {
    if (!user) return;

    try {
      await MedicationService.confirmDose(user.id, dosageId, new Date());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadMedications(); // Reload to update status
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

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
        <Text style={styles.title}>Medications</Text>
        {selectedCycle && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAdd}
          >
            <IconSymbol name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Cycle Selector */}
      {cycles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cycleSelector}
          contentContainerStyle={styles.cycleSelectorContent}
        >
          {cycles.map((cycle) => (
            <TouchableOpacity
              key={cycle.id}
              style={[
                styles.cycleChip,
                selectedCycle?.id === cycle.id && styles.cycleChipSelected,
              ]}
              onPress={() => setSelectedCycle(cycle)}
            >
              <Text
                style={[
                  styles.cycleChipText,
                  selectedCycle?.id === cycle.id && styles.cycleChipTextSelected,
                ]}
              >
                {cycle.cycle_type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {cycles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="pills" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No active cycles</Text>
          <Text style={styles.emptySubtext}>
            Create a cycle first to add medications
          </Text>
          <TouchableOpacity
            style={styles.createCycleButton}
            onPress={() => router.push('/cycle/new')}
          >
            <Text style={styles.createCycleButtonText}>Create Cycle</Text>
          </TouchableOpacity>
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="pills" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No medications</Text>
          <Text style={styles.emptySubtext}>
            Add medications to track for this cycle
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createButtonText}>Add Medication</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={medications}
          renderItem={({ item }) => (
            <MedicationCard
              medication={item}
              onConfirmDose={handleConfirmDose}
              confirmedDosageIds={confirmedDosageIds}
              onPress={() => handleView(item)}
              onEdit={() => handleEdit(item)}
            />
          )}
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
            <TouchableOpacity onPress={() => {
              setModalVisible(false);
              resetForm();
            }}>
              <Text style={styles.cancelText}>{mode === 'view' ? 'Close' : 'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {mode === 'view' ? 'Medication Details' : (editingMedicationId ? 'Edit Medication' : 'Add Medication')}
            </Text>
            {mode === 'view' ? (
              <TouchableOpacity onPress={() => handleEdit(viewingMedication!)}>
                <Text style={styles.saveText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={[styles.saveText, saving && styles.disabledText]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {mode === 'view' && viewingMedication ? (
            <ScrollView style={styles.form}>
              <View style={styles.viewSection}>
                <View style={styles.viewHeader}>
                  <View style={styles.viewIconContainer}>
                    <IconSymbol
                      name={getRouteIcon(viewingMedication.route)}
                      size={40}
                      color="#FF9500"
                    />
                  </View>
                  <View style={styles.viewTitleContainer}>
                    <Text style={styles.viewTitle}>{viewingMedication.name}</Text>
                    {viewingMedication.route && (
                      <Text style={styles.viewRoute}>{viewingMedication.route}</Text>
                    )}
                  </View>
                </View>

                {viewingMedication.purpose && (
                  <View style={styles.viewRow}>
                    <Text style={styles.viewLabel}>Purpose</Text>
                    <Text style={styles.viewValue}>{viewingMedication.purpose}</Text>
                  </View>
                )}

                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Dosage</Text>

                {viewingMedication.medication_dosages?.map((dosage, index) => (
                  <View key={dosage.id} style={styles.viewDosageCard}>
                    <View style={styles.viewDosageRow}>
                      <Text style={styles.viewLabel}>Amount</Text>
                      <Text style={styles.viewValue}>{dosage.dosage_amount} {dosage.dosage_unit}</Text>
                    </View>
                    <View style={styles.viewDosageRow}>
                      <Text style={styles.viewLabel}>Time</Text>
                      <Text style={styles.viewValue}>
                        {dosage.time_of_day ? new Date(`2000-01-01T${dosage.time_of_day}`).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        }) : 'No time set'}
                      </Text>
                    </View>
                  </View>
                ))}

                {viewingMedication.instructions && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>Instructions</Text>
                    <View style={styles.instructionBox}>
                      <IconSymbol name="info.circle" size={20} color="#666" />
                      <Text style={styles.instructionText}>{viewingMedication.instructions}</Text>
                    </View>
                  </>
                )}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <ScrollView style={styles.form}>
              <Text style={styles.sectionTitle}>Basic Info</Text>
              <Text style={styles.label}>Medication Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Gonal-F, Menopur"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Route</Text>
              <View style={styles.routeRow}>
                {ROUTES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.routeButton,
                      route === r && styles.routeButtonSelected,
                    ]}
                    onPress={() => setRoute(r)}
                  >
                    <Text
                      style={[
                        styles.routeButtonText,
                        route === r && styles.routeButtonTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Purpose</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Follicle stimulation"
                value={purpose}
                onChangeText={setPurpose}
              />

              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Dosage Details</Text>

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.0"
                    value={dosageAmount}
                    onChangeText={setDosageAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                    {UNITS.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitButton,
                          dosageUnit === u && styles.unitButtonSelected,
                        ]}
                        onPress={() => setDosageUnit(u)}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            dosageUnit === u && styles.unitButtonTextSelected,
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.label}>Daily Schedule Time</Text>
              {Platform.OS === 'android' ? (
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {dosageTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {(Platform.OS === 'ios' || showDatePicker) && (
                <View style={Platform.OS === 'ios' ? styles.datePickerContainer : undefined}>
                  <DateTimePicker
                    value={dosageTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (date) {
                        setDosageTime(date);
                      }
                    }}
                    style={styles.datePicker}
                  />
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.label}>Instructions</Text>
              <TextInput
                style={[styles.input, styles.instructionsInput]}
                placeholder="Special instructions associated with this medication"
                value={instructions}
                onChangeText={setInstructions}
                multiline
              />

              {/* Spacer for bottom safety */}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cycleSelector: {
    backgroundColor: '#fff',
    maxHeight: 60,
  },
  cycleSelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  cycleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cycleChipSelected: {
    backgroundColor: '#007AFF',
  },
  cycleChipText: {
    fontSize: 14,
    color: '#666',
  },
  cycleChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createCycleButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  createCycleButtonText: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  instructionsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  routeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  routeButtonSelected: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  routeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  routeButtonTextSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  flex1: {
    flex: 1,
  },
  unitScroll: {
    flexDirection: 'row',
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  unitButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 14,
    color: '#333',
  },
  unitButtonTextSelected: {
    color: '#fff',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'flex-start',
  },
  datePicker: {
    alignSelf: 'stretch',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  // View Mode Styles
  viewSection: {
    padding: 0,
  },
  viewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  viewIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  viewTitleContainer: {
    flex: 1,
  },
  viewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  viewRoute: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  viewRow: {
    marginBottom: 16,
  },
  viewLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  viewValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  viewDosageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  viewDosageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});
