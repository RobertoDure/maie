import { MedicationCard } from '@/components/medication-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService, MedicationService } from '@/lib/services';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

export default function MedicationsScreen() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [medications, setMedications] = useState<MedicationWithDosages[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [route, setRoute] = useState('');
  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');

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
      const data = await MedicationService.getMedications(user.id, selectedCycle.id);
      setMedications(data as MedicationWithDosages[]);
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
  };

  const handleCreate = async () => {
    if (!user || !selectedCycle) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a medication name');
      return;
    }

    setSaving(true);
    try {
      await MedicationService.createMedication(user.id, selectedCycle.id, {
        name: name.trim(),
        route: route || null,
        purpose: purpose || null,
        instructions: instructions || null,
        start_date: null,
        end_date: null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      resetForm();
      loadMedications();
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
      Alert.alert('Dose Confirmed', 'Your medication has been logged');
      loadMedications();
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
            onPress={() => setModalVisible(true)}
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
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              <Text style={[styles.saveText, saving && styles.disabledText]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
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

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.instructionsInput]}
              placeholder="Special instructions for taking this medication"
              value={instructions}
              onChangeText={setInstructions}
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
});
