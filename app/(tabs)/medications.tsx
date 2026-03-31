import { MedicationCard } from '@/components/medication-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
    BrandColors,
    NeutralColors,
    Radius,
    SemanticColors,
    Shadows,
    Spacing,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService } from '@/lib/services/cycle.service';
import { MedicationService } from '@/lib/services/medication.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

interface FormState {
  name: string;
  route: string;
  purpose: string;
  instructions: string;
  dosageAmount: string;
  dosageUnit: string;
  dosageTime: Date;
  showDatePicker: boolean;
}

const initialFormState: FormState = {
  name: '',
  route: '',
  purpose: '',
  instructions: '',
  dosageAmount: '',
  dosageUnit: 'mg',
  dosageTime: new Date(),
  showDatePicker: false,
};

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: any }
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: Partial<FormState> };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialFormState;
    case 'LOAD':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

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

  // Form state — consolidated into reducer
  const [form, dispatchForm] = useReducer(formReducer, initialFormState);

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
    dispatchForm({ type: 'RESET' });
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

    const formPayload: Partial<FormState> = {
      name: medication.name || '',
      route: medication.route || '',
      purpose: medication.purpose || '',
      instructions: medication.instructions || '',
    };

    // For MVP, we presume one dosage per medication or take the first one
    const dosage = medication.medication_dosages?.[0];
    if (dosage) {
      setEditingDosageId(dosage.id);
      formPayload.dosageAmount = dosage.dosage_amount?.toString() || '';
      formPayload.dosageUnit = dosage.dosage_unit || 'mg';

      if (dosage.time_of_day) {
        const [hours, minutes] = dosage.time_of_day.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        formPayload.dosageTime = date;
      }
    }

    dispatchForm({ type: 'LOAD', payload: formPayload });
    setEditingMedicationId(medication.id);
  };

  const handleSave = async () => {
    if (!user || !selectedCycle) return;
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter a medication name');
      return;
    }

    setSaving(true);
    try {
      let medicationId = editingMedicationId;

      if (editingMedicationId) {
        // Update existing medication
        await MedicationService.updateMedication(user.id, editingMedicationId, {
          name: form.name.trim(),
          route: form.route || null,
          purpose: form.purpose || null,
          instructions: form.instructions || null,
        });
      } else {
        // Create new medication
        const newMedication = await MedicationService.createMedication(user.id, selectedCycle.id, {
          name: form.name.trim(),
          route: form.route || null,
          purpose: form.purpose || null,
          instructions: form.instructions || null,
          start_date: null,
          end_date: null,
        });
        medicationId = newMedication.id;
      }

      // Handle Dosage — use deterministic HH:mm format (toLocaleTimeString
      // is locale/Hermes-dependent and can produce formats like "08.30" that
      // break the notification scheduler's split(':') parsing).
      const hh = String(form.dosageTime.getHours()).padStart(2, '0');
      const mm = String(form.dosageTime.getMinutes()).padStart(2, '0');
      const timeString = `${hh}:${mm}`;

      if (editingDosageId) {
        // Update existing dosage
        await MedicationService.updateDosage(user.id, editingDosageId, {
          dosage_amount: form.dosageAmount.trim() ? parseFloat(form.dosageAmount) : null,
          dosage_unit: form.dosageUnit,
          time_of_day: timeString,
        });
      } else if (medicationId && form.dosageAmount.trim()) {
        // Create new dosage
        await MedicationService.addDosage(user.id, medicationId, {
          dosage_amount: parseFloat(form.dosageAmount),
          dosage_unit: form.dosageUnit,
          time_of_day: timeString,
          frequency: 'Daily',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await loadMedications();

      // Reschedule medication reminders to reflect changes
      import('@/lib/services/notification.service')
        .then(({ NotificationService }) =>
          NotificationService.scheduleAllMedicationReminders(user.id)
        )
        .catch((e) =>
          console.error('[Medications] Failed to reschedule reminders:', e)
        );

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

  const renderMedicationItem = useCallback(({ item }: { item: MedicationWithDosages }) => (
    <MedicationCard
      medication={item}
      onConfirmDose={handleConfirmDose}
      confirmedDosageIds={confirmedDosageIds}
      onPress={() => handleView(item)}
      onEdit={() => handleEdit(item)}
    />
  ), [confirmedDosageIds]);

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
        <Text style={styles.title}>Medications</Text>
        {selectedCycle ? (
          <Pressable
            style={styles.addButton}
            onPress={handleAdd}
          >
            <IconSymbol name="plus" size={24} color={NeutralColors.white} />
          </Pressable>
        ) : null}
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
            <Pressable
              key={cycle.id}
              style={[
                styles.cycleChip,
                selectedCycle?.id === cycle.id ? styles.cycleChipSelected : undefined,
              ]}
              onPress={() => setSelectedCycle(cycle)}
            >
              <Text
                style={[
                  styles.cycleChipText,
                  selectedCycle?.id === cycle.id ? styles.cycleChipTextSelected : undefined,
                ]}
              >
                {cycle.cycle_type}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {cycles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="pills" size={64} color={NeutralColors.gray200} />
          <Text style={styles.emptyText}>No active cycles</Text>
          <Text style={styles.emptySubtext}>
            Create a cycle first to add medications
          </Text>
          <Pressable
            style={styles.createCycleButton}
            onPress={() => router.push('/cycle/new')}
          >
            <Text style={styles.createCycleButtonText}>Create Cycle</Text>
          </Pressable>
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="pills" size={64} color={NeutralColors.gray200} />
          <Text style={styles.emptyText}>No medications</Text>
          <Text style={styles.emptySubtext}>
            Add medications to track for this cycle
          </Text>
          <Pressable
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createButtonText}>Add Medication</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={medications}
          renderItem={renderMedicationItem}
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
            <Pressable onPress={() => {
              setModalVisible(false);
              resetForm();
            }}>
              <Text style={styles.cancelText}>{mode === 'view' ? 'Close' : 'Cancel'}</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {mode === 'view' ? 'Medication Details' : (editingMedicationId ? 'Edit Medication' : 'Add Medication')}
            </Text>
            {mode === 'view' ? (
              <Pressable onPress={() => handleEdit(viewingMedication!)}>
                <Text style={styles.saveText}>Edit</Text>
              </Pressable>
            ) : (
              <Pressable onPress={handleSave} disabled={saving}>
                <Text style={[styles.saveText, saving ? styles.disabledText : undefined]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            )}
          </View>

          {mode === 'view' && viewingMedication ? (
            <ScrollView style={styles.form}>
              {/* Header card */}
              <View style={styles.viewCard}>
                <View style={[styles.viewCardAccent, { backgroundColor: SemanticColors.warning }]} />
                <View style={styles.viewCardBody}>
                  <View style={styles.viewCardTitleRow}>
                    <View style={styles.viewIconContainer}>
                      <IconSymbol
                        name={getRouteIcon(viewingMedication.route)}
                        size={24}
                        color={SemanticColors.warning}
                      />
                    </View>
                    <View style={styles.viewTitleContainer}>
                      <Text style={styles.viewTitle}>{viewingMedication.name}</Text>
                      {viewingMedication.route && (
                        <View style={styles.viewRouteBadge}>
                          <Text style={styles.viewRouteText}>{viewingMedication.route}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {viewingMedication.purpose && (
                    <View style={styles.viewDetailRow}>
                      <IconSymbol name="info.circle" size={15} color={NeutralColors.gray400} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.viewDetailLabel}>Purpose</Text>
                        <Text style={styles.viewDetailValue}>{viewingMedication.purpose}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Dosage card */}
              <View style={styles.viewCard}>
                <View style={[styles.viewCardAccent, { backgroundColor: BrandColors.accent }]} />
                <View style={styles.viewCardBody}>
                  <View style={styles.viewCardTitleRow}>
                    <View style={[styles.viewIconContainer, { backgroundColor: BrandColors.accent + '12' }]}>
                      <IconSymbol name="clock" size={20} color={BrandColors.accent} />
                    </View>
                    <Text style={styles.viewCardTitle}>Dosage</Text>
                  </View>

                  {viewingMedication.medication_dosages?.map((dosage) => (
                    <View key={dosage.id} style={styles.viewDosageCard}>
                      <View style={styles.viewDosageRow}>
                        <Text style={styles.viewDosageLabel}>Amount</Text>
                        <Text style={styles.viewDosageValue}>{dosage.dosage_amount} {dosage.dosage_unit}</Text>
                      </View>
                      <View style={styles.viewDosageRow}>
                        <Text style={styles.viewDosageLabel}>Time</Text>
                        <Text style={[styles.viewDosageValue, { color: BrandColors.accent }]}>
                          {dosage.time_of_day ? new Date(`2000-01-01T${dosage.time_of_day}`).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          }) : 'No time set'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Instructions card */}
              {viewingMedication.instructions && (
                <View style={styles.viewCard}>
                  <View style={[styles.viewCardAccent, { backgroundColor: BrandColors.primary }]} />
                  <View style={styles.viewCardBody}>
                    <View style={styles.viewCardTitleRow}>
                      <View style={[styles.viewIconContainer, { backgroundColor: BrandColors.primary + '12' }]}>
                        <IconSymbol name="doc.text" size={20} color={BrandColors.primary} />
                      </View>
                      <Text style={styles.viewCardTitle}>Instructions</Text>
                    </View>
                    <View style={styles.instructionBox}>
                      <Text style={styles.instructionText}>{viewingMedication.instructions}</Text>
                    </View>
                  </View>
                </View>
              )}
              <View style={{ height: Spacing.xl }} />
            </ScrollView>
          ) : (
            <ScrollView style={styles.form}>
              <Text style={styles.sectionTitle}>Basic Info</Text>
              <Text style={styles.label}>Medication Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Gonal-F, Menopur"
                value={form.name}
                onChangeText={(v) => dispatchForm({ type: 'SET_FIELD', field: 'name', value: v })}
              />

              <Text style={styles.label}>Route</Text>
              <View style={styles.routeRow}>
                {ROUTES.map((r) => (
                  <Pressable
                    key={r}
                    style={[
                      styles.routeButton,
                      form.route === r ? styles.routeButtonSelected : undefined,
                    ]}
                    onPress={() => dispatchForm({ type: 'SET_FIELD', field: 'route', value: r })}
                  >
                    <Text
                      style={[
                        styles.routeButtonText,
                        form.route === r ? styles.routeButtonTextSelected : undefined,
                      ]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Purpose</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Follicle stimulation"
                value={form.purpose}
                onChangeText={(v) => dispatchForm({ type: 'SET_FIELD', field: 'purpose', value: v })}
              />

              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Dosage Details</Text>

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.0"
                    value={form.dosageAmount}
                    onChangeText={(v) => dispatchForm({ type: 'SET_FIELD', field: 'dosageAmount', value: v })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                    {UNITS.map((u) => (
                      <Pressable
                        key={u}
                        style={[
                          styles.unitButton,
                          form.dosageUnit === u ? styles.unitButtonSelected : undefined,
                        ]}
                        onPress={() => dispatchForm({ type: 'SET_FIELD', field: 'dosageUnit', value: u })}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            form.dosageUnit === u ? styles.unitButtonTextSelected : undefined,
                          ]}
                        >
                          {u}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.label}>Daily Schedule Time</Text>
              {Platform.OS === 'android' ? (
                <Pressable
                  style={styles.dateButton}
                  onPress={() => dispatchForm({ type: 'SET_FIELD', field: 'showDatePicker', value: true })}
                >
                  <Text style={styles.dateButtonText}>
                    {form.dosageTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                </Pressable>
              ) : null}

              {(Platform.OS === 'ios' || form.showDatePicker) ? (
                <View style={Platform.OS === 'ios' ? styles.datePickerContainer : undefined}>
                  <DateTimePicker
                    value={form.dosageTime}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    textColor={NeutralColors.gray900}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') {
                        dispatchForm({ type: 'SET_FIELD', field: 'showDatePicker', value: false });
                      }
                      if (date) {
                        dispatchForm({ type: 'SET_FIELD', field: 'dosageTime', value: date });
                      }
                    }}
                    style={styles.datePicker}
                  />
                </View>
              ) : null}

              <View style={styles.divider} />

              <Text style={styles.label}>Instructions</Text>
              <TextInput
                style={[styles.input, styles.instructionsInput]}
                placeholder="Special instructions associated with this medication"
                value={form.instructions}
                onChangeText={(v) => dispatchForm({ type: 'SET_FIELD', field: 'instructions', value: v })}
                multiline
              />

              {/* Spacer for bottom safety */}
              <View style={{ height: Spacing.xl }} />
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
    padding: Spacing.xl,
    paddingTop: 60,
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: NeutralColors.gray900,
  },
  addButton: {
    backgroundColor: BrandColors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cycleSelector: {
    backgroundColor: NeutralColors.white,
    maxHeight: 60,
  },
  cycleSelectorContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  cycleChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: NeutralColors.gray50,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
  },
  cycleChipSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  cycleChipText: {
    fontSize: 14,
    color: NeutralColors.gray400,
  },
  cycleChipTextSelected: {
    color: NeutralColors.white,
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: '600',
    marginTop: Spacing.lg,
    color: NeutralColors.gray900,
  },
  emptySubtext: {
    fontSize: 16,
    color: NeutralColors.gray400,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.xxl,
  },
  createButtonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  createCycleButton: {
    backgroundColor: SemanticColors.warning,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.xxl,
  },
  createCycleButtonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: NeutralColors.gray400,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.sm,
    padding: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    color: NeutralColors.gray900,
  },
  instructionsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  routeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  routeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: NeutralColors.white,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
  },
  routeButtonSelected: {
    backgroundColor: SemanticColors.warning,
    borderColor: SemanticColors.warning,
  },
  routeButtonText: {
    fontSize: 14,
    color: NeutralColors.gray900,
  },
  routeButtonTextSelected: {
    color: NeutralColors.white,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  flex1: {
    flex: 1,
  },
  unitScroll: {
    flexDirection: 'row',
  },
  unitButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: NeutralColors.white,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    marginRight: Spacing.sm,
  },
  unitButtonSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    color: NeutralColors.gray900,
  },
  unitButtonTextSelected: {
    color: NeutralColors.white,
  },
  datePickerContainer: {
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  datePicker: {
    alignSelf: 'stretch',
    height: 150,
  },
  divider: {
    height: 1,
    backgroundColor: NeutralColors.gray100,
    marginVertical: Spacing.xxl,
  },
  dateButton: {
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: NeutralColors.gray900,
  },
  // View Mode — card pattern
  viewCard: {
    flexDirection: 'row',
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  viewCardAccent: {
    width: 4,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  viewCardBody: {
    flex: 1,
    padding: Spacing.lg,
  },
  viewCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  viewIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SemanticColors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  viewTitleContainer: {
    flex: 1,
  },
  viewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.gray900,
  },
  viewRouteBadge: {
    backgroundColor: SemanticColors.warning + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  viewRouteText: {
    fontSize: 12,
    color: SemanticColors.warning,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.gray100,
  },
  viewDetailLabel: {
    fontSize: 12,
    color: NeutralColors.gray400,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  viewDetailValue: {
    fontSize: 15,
    color: NeutralColors.gray900,
    lineHeight: 22,
  },
  viewDosageCard: {
    backgroundColor: NeutralColors.gray50,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  viewDosageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  viewDosageLabel: {
    fontSize: 13,
    color: NeutralColors.gray400,
    fontWeight: '500',
  },
  viewDosageValue: {
    fontSize: 15,
    color: NeutralColors.gray900,
    fontWeight: '500',
  },
  instructionBox: {
    backgroundColor: NeutralColors.gray50,
    padding: Spacing.lg,
    borderRadius: Radius.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: NeutralColors.gray900,
    lineHeight: 22,
  },
});
