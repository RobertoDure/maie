import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { MoodService, MoodTrend } from '@/lib/services';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SYMPTOMS = [
  'Bloating',
  'Headache',
  'Fatigue',
  'Nausea',
  'Cramping',
  'Mood Swings',
  'Hot Flashes',
  'Tender Breasts',
  'Insomnia',
  'Spotting',
];

export default function MoodScreen() {
  const { user } = useAuth();
  const [hasTodayCheckin, setHasTodayCheckin] = useState(false);
  const [moodScore, setMoodScore] = useState(3);
  const [anxietyLevel, setAnxietyLevel] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<MoodTrend[]>([]);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState(3);
  const [symptomNotes, setSymptomNotes] = useState('');
  const [savingSymptom, setSavingSymptom] = useState(false);

  useEffect(() => {
    checkTodayCheckin();
    loadTrends();
  }, [user]);

  const checkTodayCheckin = async () => {
    if (!user) return;
    const hasCheckin = await MoodService.hasTodayCheckin(user.id);
    setHasTodayCheckin(hasCheckin);
  };

  const loadTrends = async () => {
    if (!user) return;
    try {
      const data = await MoodService.getMoodTrends(user.id, undefined, 14);
      setTrends(data);
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  };

  const handleMoodChange = (score: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoodScore(score);
  };

  const handleAnxietyChange = (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnxietyLevel(level);
  };

  const submitCheckin = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await MoodService.createCheckin(user.id, {
        mood_score: moodScore,
        anxiety_level: anxietyLevel,
        notes: notes || null,
        cycle_id: null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Mood check-in recorded');
      setHasTodayCheckin(true);
      setNotes('');
      loadTrends();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitSymptom = async () => {
    if (!user || !selectedSymptom) return;

    setSavingSymptom(true);
    try {
      await MoodService.logSymptom(user.id, {
        symptom: selectedSymptom,
        severity: symptomSeverity,
        notes: symptomNotes || null,
        cycle_id: null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Symptom logged');
      setShowSymptomForm(false);
      setSelectedSymptom('');
      setSymptomSeverity(3);
      setSymptomNotes('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingSymptom(false);
    }
  };

  const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];
  const anxietyEmojis = ['😌', '🙂', '😐', '😟', '😰'];
  const severityLabels = ['Very Mild', 'Mild', 'Moderate', 'Severe', 'Very Severe'];

  // Simple trend visualization helper
  const renderTrendBar = (value: number, maxValue: number, color: string) => (
    <View style={[styles.trendBar, { width: `${(value / maxValue) * 100}%`, backgroundColor: color }]} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wellness</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {hasTodayCheckin ? (
          <View style={styles.completedContainer}>
            <IconSymbol name="checkmark.circle.fill" size={64} color="#34C759" />
            <Text style={styles.completedText}>Today's check-in complete!</Text>
            <Text style={styles.completedSubtext}>
              Come back tomorrow to track your progress
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How are you feeling today?</Text>
              <View style={styles.emojiRow}>
                {moodEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.emojiButton,
                      moodScore === index + 1 && styles.emojiButtonSelected,
                    ]}
                    onPress={() => handleMoodChange(index + 1)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Anxiety level</Text>
              <View style={styles.emojiRow}>
                {anxietyEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.emojiButton,
                      anxietyLevel === index + 1 && styles.emojiButtonSelected,
                    ]}
                    onPress={() => handleAnxietyChange(index + 1)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="How are you feeling today?"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={submitCheckin}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Saving...' : 'Complete Check-in'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Symptom Logging Section */}
        <View style={styles.divider} />
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Log a Symptom</Text>
            <TouchableOpacity onPress={() => setShowSymptomForm(!showSymptomForm)}>
              <IconSymbol
                name={showSymptomForm ? 'chevron.up' : 'chevron.down'}
                size={20}
                color="#007AFF"
              />
            </TouchableOpacity>
          </View>

          {showSymptomForm && (
            <>
              <Text style={styles.label}>Select symptom</Text>
              <View style={styles.symptomGrid}>
                {SYMPTOMS.map((symptom) => (
                  <TouchableOpacity
                    key={symptom}
                    style={[
                      styles.symptomChip,
                      selectedSymptom === symptom && styles.symptomChipSelected,
                    ]}
                    onPress={() => setSelectedSymptom(symptom)}
                  >
                    <Text
                      style={[
                        styles.symptomChipText,
                        selectedSymptom === symptom && styles.symptomChipTextSelected,
                      ]}
                    >
                      {symptom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedSymptom && (
                <>
                  <Text style={styles.label}>Severity: {severityLabels[symptomSeverity - 1]}</Text>
                  <View style={styles.severityRow}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.severityButton,
                          symptomSeverity === level && styles.severityButtonSelected,
                        ]}
                        onPress={() => setSymptomSeverity(level)}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            symptomSeverity === level && styles.severityTextSelected,
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.symptomNotesInput}
                    placeholder="Any notes about this symptom"
                    value={symptomNotes}
                    onChangeText={setSymptomNotes}
                  />

                  <TouchableOpacity
                    style={[styles.symptomSubmitButton, savingSymptom && styles.submitButtonDisabled]}
                    onPress={submitSymptom}
                    disabled={savingSymptom}
                  >
                    <Text style={styles.submitButtonText}>
                      {savingSymptom ? 'Saving...' : 'Log Symptom'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {/* Trends Section - Simple Visual */}
        {trends.length > 1 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>14-Day Trends</Text>
              <View style={styles.trendContainer}>
                <View style={styles.trendLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.legendText}>Mood</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.legendText}>Anxiety</Text>
                  </View>
                </View>
                {trends.slice(-7).map((trend, index) => (
                  <View key={index} style={styles.trendRow}>
                    <Text style={styles.trendDate}>
                      {new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <View style={styles.trendBarsContainer}>
                      <View style={styles.trendBarWrapper}>
                        {renderTrendBar(trend.mood_score, 5, '#34C759')}
                      </View>
                      <View style={styles.trendBarWrapper}>
                        {renderTrendBar(trend.anxiety_level, 5, '#FF3B30')}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  emojiButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FF',
  },
  emoji: {
    fontSize: 28,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginBottom: 24,
  },
  completedText: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  completedSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  symptomChipSelected: {
    backgroundColor: '#FF2D55',
    borderColor: '#FF2D55',
  },
  symptomChipText: {
    fontSize: 14,
    color: '#333',
  },
  symptomChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  severityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  severityButtonSelected: {
    backgroundColor: '#FF2D55',
    borderColor: '#FF2D55',
  },
  severityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  severityTextSelected: {
    color: '#fff',
  },
  symptomNotesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  symptomSubmitButton: {
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  trendContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  trendLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trendDate: {
    width: 40,
    fontSize: 12,
    color: '#666',
  },
  trendBarsContainer: {
    flex: 1,
    gap: 4,
  },
  trendBarWrapper: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBar: {
    height: '100%',
    borderRadius: 4,
  },
});
