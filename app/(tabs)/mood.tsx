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

const WellnessPink = '#FF2D55';

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
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: SemanticColors.success }]} />
            <View style={styles.cardBody}>
              <View style={styles.completedContainer}>
                <IconSymbol name="checkmark.circle.fill" size={56} color={SemanticColors.success} />
                <Text style={styles.completedText}>Today's check-in complete!</Text>
                <Text style={styles.completedSubtext}>
                  Come back tomorrow to track your progress
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: BrandColors.primary }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardIconCircle, { backgroundColor: BrandColors.primary + '12' }]}>
                  <IconSymbol name="heart.text.square" size={20} color={BrandColors.primary} />
                </View>
                <Text style={styles.cardTitle}>Daily Check-in</Text>
              </View>

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
                  placeholderTextColor={NeutralColors.gray300}
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
            </View>
          </View>
        )}

        {/* Symptom Logging Card */}
        <View style={styles.card}>
          <View style={[styles.cardAccent, { backgroundColor: WellnessPink }]} />
          <View style={styles.cardBody}>
            <TouchableOpacity
              style={styles.cardTitleRow}
              activeOpacity={0.7}
              onPress={() => setShowSymptomForm(!showSymptomForm)}
            >
              <View style={[styles.cardIconCircle, { backgroundColor: WellnessPink + '12' }]}>
                <IconSymbol name="staroflife" size={20} color={WellnessPink} />
              </View>
              <Text style={[styles.cardTitle, { flex: 1 }]}>Log a Symptom</Text>
              <IconSymbol
                name={showSymptomForm ? 'chevron.up' : 'chevron.down'}
                size={18}
                color={NeutralColors.gray400}
              />
            </TouchableOpacity>

            {showSymptomForm && (
              <View style={styles.section}>
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
                      placeholderTextColor={NeutralColors.gray300}
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
              </View>
            )}
          </View>
        </View>

        {/* Trends Card */}
        {trends.length > 1 && (
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: BrandColors.accent }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardIconCircle, { backgroundColor: BrandColors.accent + '12' }]}>
                  <IconSymbol name="chart.bar" size={20} color={BrandColors.accent} />
                </View>
                <Text style={styles.cardTitle}>14-Day Trends</Text>
              </View>

              <View style={styles.trendLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: SemanticColors.success }]} />
                  <Text style={styles.legendText}>Mood</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: SemanticColors.error }]} />
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
                      {renderTrendBar(trend.mood_score, 5, SemanticColors.success)}
                    </View>
                    <View style={styles.trendBarWrapper}>
                      {renderTrendBar(trend.anxiety_level, 5, SemanticColors.error)}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  header: {
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
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  // Card shared pattern
  card: {
    flexDirection: 'row',
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardAccent: {
    width: 4,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  cardBody: {
    flex: 1,
    padding: Spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  // Sections inside cards
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: Spacing.sm,
  },
  // Emoji selector
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  emojiButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: NeutralColors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: NeutralColors.gray100,
  },
  emojiButtonSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primary + '12',
  },
  emoji: {
    fontSize: 26,
  },
  // Notes input
  notesInput: {
    backgroundColor: NeutralColors.gray50,
    borderRadius: Radius.sm,
    padding: Spacing.lg,
    fontSize: 15,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    minHeight: 96,
    textAlignVertical: 'top',
    marginTop: Spacing.sm,
    color: NeutralColors.gray900,
  },
  // Submit button
  submitButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Completed state
  completedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  completedText: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: Spacing.lg,
    color: NeutralColors.gray900,
  },
  completedSubtext: {
    fontSize: 15,
    color: NeutralColors.gray400,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  // Symptom form
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: NeutralColors.gray400,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  symptomChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: NeutralColors.gray50,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
  },
  symptomChipSelected: {
    backgroundColor: WellnessPink,
    borderColor: WellnessPink,
  },
  symptomChipText: {
    fontSize: 14,
    color: NeutralColors.gray900,
  },
  symptomChipTextSelected: {
    color: NeutralColors.white,
    fontWeight: '600',
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  severityButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: NeutralColors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
  },
  severityButtonSelected: {
    backgroundColor: WellnessPink,
    borderColor: WellnessPink,
  },
  severityText: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.gray900,
  },
  severityTextSelected: {
    color: NeutralColors.white,
  },
  symptomNotesInput: {
    backgroundColor: NeutralColors.gray50,
    borderRadius: Radius.sm,
    padding: Spacing.lg,
    fontSize: 15,
    borderWidth: 1,
    borderColor: NeutralColors.gray100,
    marginBottom: Spacing.lg,
    color: NeutralColors.gray900,
  },
  symptomSubmitButton: {
    backgroundColor: WellnessPink,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  // Trends
  trendLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: NeutralColors.gray400,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  trendDate: {
    width: 40,
    fontSize: 12,
    color: NeutralColors.gray400,
    fontWeight: '500',
  },
  trendBarsContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  trendBarWrapper: {
    height: 8,
    backgroundColor: NeutralColors.gray50,
    borderRadius: Spacing.xs,
    overflow: 'hidden',
  },
  trendBar: {
    height: '100%',
    borderRadius: Spacing.xs,
  },
});
