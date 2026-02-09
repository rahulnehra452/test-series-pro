import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTestStore } from '../stores/testStore';
import { Card } from '../components/common/Card';
import { ExpandableText } from '../components/common/ExpandableText';

type FilterMode = 'all' | 'marked' | 'incorrect' | 'correct';

export default function SolutionsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { attemptId } = (route.params as { attemptId?: string }) || {};
  const { history } = useTestStore();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const attempt = history.find(h => h.id === attemptId);

  const allQuestions = useMemo(() => {
    if (!attempt) return [];
    // Use the stored questions from the attempt for exact sync
    return attempt.questions || [];
  }, [attempt]);

  const filteredQuestions = useMemo(() => {
    if (!attempt) return [];
    return allQuestions.filter(q => {
      const userAnswer = attempt.answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      const isMarked = attempt.markedForReview?.[q.id];

      switch (filterMode) {
        case 'marked': return isMarked;
        case 'incorrect': return userAnswer !== undefined && !isCorrect;
        case 'correct': return isCorrect;
        default: return true;
      }
    });
  }, [allQuestions, attempt, filterMode]);

  const correctCount = allQuestions.filter(q => attempt?.answers[q.id] === q.correctAnswer).length;
  const incorrectCount = allQuestions.filter(q => {
    const ans = attempt?.answers[q.id];
    return ans !== undefined && ans !== q.correctAnswer;
  }).length;
  const markedCount = allQuestions.filter(q => attempt?.markedForReview?.[q.id]).length;

  if (!attempt) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Solutions</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Attempt not found.</Text>
        </View>
      </View>
    );
  }

  const FilterChip = ({ mode, label, count }: { mode: FilterMode; label: string; count?: number }) => {
    const isActive = filterMode === mode;
    return (
      <TouchableOpacity
        onPress={() => setFilterMode(mode)}
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? colors.primary : (isDark ? 'rgba(255,255,255,0.12)' : '#F0F0F0'),
            borderColor: isActive ? colors.primary : (isDark ? 'rgba(255,255,255,0.3)' : '#D0D0D0'),
          }
        ]}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.filterChipText,
          { color: isActive ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#333333'), fontWeight: '600' }
        ]}>
          {label}{count !== undefined && count > 0 ? ` (${count})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Solutions</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip mode="all" label="All" count={allQuestions.length} />
          <FilterChip mode="correct" label="Correct" count={correctCount} />
          <FilterChip mode="incorrect" label="Incorrect" count={incorrectCount} />
          <FilterChip mode="marked" label="Marked" count={markedCount} />
        </ScrollView>
      </View>

      {/* Questions List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredQuestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="filter-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No questions match this filter.
            </Text>
          </View>
        ) : filteredQuestions.map((q) => {
          const originalIndex = allQuestions.findIndex(oq => oq.id === q.id);
          const userAnswerIdx = attempt.answers[q.id];
          const isCorrect = userAnswerIdx === q.correctAnswer;
          const isSkipped = userAnswerIdx === undefined || userAnswerIdx === null;

          return (
            <Card key={q.id} style={styles.questionCard} padding={spacing.md}>
              {/* Question Header */}
              <View style={styles.qHeader}>
                <Text style={[styles.qNumber, { color: colors.textSecondary }]}>Question {originalIndex + 1}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isCorrect ? colors.success : isSkipped ? colors.warning : colors.error }
                ]}>
                  <Text style={styles.statusText}>
                    {isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Incorrect'}
                  </Text>
                </View>
              </View>

              {/* Question Text */}
              <Text style={[styles.qText, { color: colors.text }]}>{q.text}</Text>

              {/* Options */}
              <View style={styles.optionsList}>
                {q.options.map((opt: string, optIdx: number) => {
                  const isSelected = userAnswerIdx === optIdx;
                  const isAnswer = q.correctAnswer === optIdx;

                  let optionBg = isDark ? 'rgba(255,255,255,0.04)' : colors.secondaryBackground;
                  let borderColor = isDark ? 'rgba(255,255,255,0.1)' : colors.border;
                  let textColor = colors.text;
                  let iconName: 'checkmark-circle' | 'close-circle' | 'checkmark-circle-outline' | null = null;
                  let iconColor = colors.text;

                  if (isAnswer) {
                    optionBg = colors.success + '18';
                    borderColor = colors.success;
                    textColor = colors.success;
                    iconName = isSelected ? 'checkmark-circle' : 'checkmark-circle-outline';
                    iconColor = colors.success;
                  } else if (isSelected) {
                    optionBg = colors.error + '18';
                    borderColor = colors.error;
                    textColor = colors.error;
                    iconName = 'close-circle';
                    iconColor = colors.error;
                  }

                  return (
                    <View key={optIdx} style={[
                      styles.option,
                      { backgroundColor: optionBg, borderColor: borderColor }
                    ]}>
                      <View style={[styles.optionLabelBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                        <Text style={[styles.optionLabel, { color: textColor }]}>
                          {String.fromCharCode(65 + optIdx)}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                      {iconName && (
                        <Ionicons name={iconName} size={22} color={iconColor} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Explanation */}
              {q.explanation && (
                <View style={[styles.explanation, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.secondaryBackground }]}>
                  <View style={styles.explanationHeader}>
                    <Ionicons name="bulb-outline" size={16} color={colors.warning} />
                    <Text style={[styles.explanationTitle, { color: colors.text }]}>Explanation</Text>
                  </View>
                  <ExpandableText
                    text={q.explanation}
                    style={[styles.explanationText, { color: colors.textSecondary }]}
                    maxLines={3}
                  />
                </View>
              )}
            </Card>
          );
        })}

        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.title3,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  questionCard: {
    // Card handles background and border
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  qNumber: {
    ...typography.caption1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  qText: {
    ...typography.body,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  optionLabelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontWeight: '700',
    fontSize: 13,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  explanation: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  explanationTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  filterContainer: {
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
});
