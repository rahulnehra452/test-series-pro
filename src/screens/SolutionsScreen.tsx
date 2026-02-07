import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTestStore } from '../stores/testStore';
import { getQuestionsForTest } from '../data/mockQuestions';
import { TestAttempt } from '../types';

export default function SolutionsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { attemptId, result } = (route.params as { attemptId?: string; result?: TestAttempt }) || {};
  const { history } = useTestStore();

  const attempt = result || history.find(h => h.id === attemptId);

  const questions = useMemo(() => {
    if (!attempt) return [];
    // In a real app, questions might be stored with attempt or fetched from backend
    // Here we use the mock generator with the stored testId
    return getQuestionsForTest(attempt.testId);
  }, [attempt]);

  if (!attempt) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Solutions</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={{ color: colors.textSecondary }}>Attempt not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Solutions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {questions.map((q, index) => {
          const userAnswerIdx = attempt.answers[q.id];
          const isCorrect = userAnswerIdx === q.correctAnswer;
          const isSkipped = userAnswerIdx === undefined || userAnswerIdx === null;

          return (
            <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.qHeader}>
                <Text style={[styles.qNumber, { color: colors.textSecondary }]}>Q.{index + 1}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isCorrect ? colors.success + '20' : isSkipped ? colors.warning + '20' : colors.error + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: isCorrect ? colors.success : isSkipped ? colors.warning : colors.error }
                  ]}>
                    {isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Incorrect'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.qText, { color: colors.text }]}>{q.text}</Text>

              <View style={styles.optionsList}>
                {q.options.map((opt, optIdx) => {
                  const isSelected = userAnswerIdx === optIdx;
                  const isAnswer = q.correctAnswer === optIdx;

                  let optionColor = colors.card;
                  let borderColor = colors.border;
                  let textColor = colors.text;

                  if (isAnswer) {
                    borderColor = colors.success;
                    optionColor = colors.success + '15';
                    textColor = colors.success;
                  } else if (isSelected && !isCorrect) {
                    borderColor = colors.error;
                    optionColor = colors.error + '15';
                    textColor = colors.error;
                  }

                  return (
                    <View key={optIdx} style={[
                      styles.option,
                      { backgroundColor: optionColor, borderColor: borderColor }
                    ]}>
                      <Text style={[styles.optionLabel, { color: textColor }]}>
                        {String.fromCharCode(65 + optIdx)}.
                      </Text>
                      <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                      {isSelected && (
                        <Ionicons
                          name={isCorrect ? "checkmark-circle" : "close-circle"}
                          size={20}
                          color={isCorrect ? colors.success : colors.error}
                          style={styles.icon}
                        />
                      )}
                      {isAnswer && !isSelected && (
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={20}
                          color={colors.success}
                          style={styles.icon}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              {q.explanation && (
                <View style={[styles.explanation, { backgroundColor: colors.secondaryBackground }]}>
                  <Text style={[styles.explanationTitle, { color: colors.text }]}>Explanation:</Text>
                  <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{q.explanation}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    ...typography.title3,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  questionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  qNumber: {
    ...typography.subhead,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  qText: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  optionLabel: {
    fontWeight: '700',
    marginRight: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
  },
  icon: {
    marginLeft: 8,
  },
  explanation: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  explanationTitle: {
    fontWeight: '700',
    marginBottom: 4,
    fontSize: 12,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
