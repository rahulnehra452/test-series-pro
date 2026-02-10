import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';

import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../constants/theme';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { useTestStore } from '../stores/testStore';
import { TestAttempt } from '../types';
import { getQuestionsForTest } from '../data/mockQuestions';
import { CircularProgress } from '../components/common/CircularProgress';

export default function ResultsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { result, attemptId } = (route.params as { result?: TestAttempt; attemptId?: string }) || {};
  const { history } = useTestStore();

  const attempt = result || history.find(h => h.id === attemptId);

  // Re-fetch calculations
  const questions = useMemo(() => {
    if (!attempt) return [];
    return getQuestionsForTest(attempt.testId);
  }, [attempt]);

  const stats = useMemo(() => {
    if (!attempt || !questions.length) return null;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    let attempted = 0;

    questions.forEach(q => {
      const userAnswer = attempt.answers[q.id];
      const hasAnswer = userAnswer !== undefined && userAnswer !== null;

      if (hasAnswer) {
        attempted++;
        if (userAnswer === q.correctAnswer) correct++;
        else incorrect++;
      } else {
        skipped++;
      }
    });

    // Fallback if skipped calc is missed (e.g. if answer map is smaller than question list)
    // Actually, skipped should be total - attempted
    skipped = questions.length - attempted;

    return { correct, incorrect, skipped, attempted, total: questions.length };
  }, [attempt, questions]);

  // Haptics
  useEffect(() => {
    if (attempt) {
      const percentage = Math.round((attempt.score / attempt.totalMarks) * 100);
      Haptics.notificationAsync(
        percentage >= 70 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
    }
  }, [attempt]);

  if (!attempt || !stats) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Result not found</Text>
        <Button title="Go Home" onPress={() => navigation.navigate('Main', { screen: 'Home' } as any)} />
      </View>
    );
  }

  // Accuracy Calculation: Correct / Attempted
  const accuracy = stats.attempted > 0
    ? Math.round((stats.correct / stats.attempted) * 100)
    : 0;

  // Progress Ring Calculation (Based on Score % or Correct %?) 
  // User asked: "Ring should show: (correctCount / totalQuestions) * 100"
  // But wait, score might differ from correct count due to negative marking.
  // Visual fill is usually Score %. But user emphasized "with 0 correct... should show 0%".
  // Let's use Score / Total Marks, but clamped to 0.
  const scorePercentage = Math.max(0, (attempt.score / attempt.totalMarks) * 100);

  // Time String
  const durationMs = (attempt.endTime || Date.now()) - attempt.startTime;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  const timeString = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  // Messaging Logic
  const getMessage = () => {
    if (scorePercentage < 30) return { text: "Review & Learn 📚", color: colors.error };
    if (scorePercentage < 50) return { text: "Keep Practicing 💪", color: colors.warning };
    if (scorePercentage < 70) return { text: "Good Progress 📈", color: colors.primary };
    return { text: "Excellent Work! 🎉", color: colors.success };
  };
  const message = getMessage();

  const handleSolutions = () => navigation.navigate('Solutions', { attemptId: attempt.id });

  const handleRetry = () => {
    Alert.alert(
      "Retry Test",
      "Are you sure? Your current results for this attempt will be discarded.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Retry", style: "destructive", onPress: () => navigation.replace('TestInterface', { testId: attempt.testId, title: attempt.testTitle }) }
      ]
    );
  };

  const handleSeries = () => navigation.navigate('Main', { screen: 'Tests' });

  // Timestamp
  const timeAgo = new Date(attempt.endTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === 'android' ? 60 : 20) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSeries} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Test Results</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {attempt.testTitle} • {stats.attempted} of {stats.total} attempted
            </Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <CircularProgress
            score={Math.max(0, attempt.score)}
            total={attempt.totalMarks}
            size={220}
            strokeWidth={20}
          />

          {/* Motivator Badge */}
          <View style={[styles.motivationalContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.secondaryBackground }]}>
            <Text style={[styles.motivationalText, { color: message.color }]}>
              {message.text}
            </Text>
          </View>

          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
            Completed at {timeAgo}
          </Text>
        </View>

        {/* Stats Grid - Reordered */}
        <View style={styles.gridContainer}>
          {/* Row 1: Correct, Wrong, Skipped */}
          <View style={styles.row}>
            <BentoCard
              label="Correct"
              value={stats.correct}
              icon="checkmark-circle"
              color={colors.success}
              delay={400}
              flex={1}
            />
            <BentoCard
              label="Wrong"
              value={stats.incorrect}
              icon="close-circle"
              color={colors.error}
              delay={500}
              flex={1}
            />
            <BentoCard
              label="Skipped"
              value={stats.skipped}
              icon="help-circle"
              color={colors.textTertiary}
              delay={600}
              flex={1}
            />
          </View>

          {/* Row 2: Combined Time & Accuracy */}
          <View>
            <Card style={[styles.combinedCard]} padding={spacing.md}>
              <View style={styles.statItem}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{timeString}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time Taken</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.statItem}>
                <Ionicons name="stats-chart" size={20} color={colors.warning} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{accuracy}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accuracy</Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Review Solutions"
            onPress={handleSolutions}
            variant="primary"
            fullWidth
            style={styles.primaryBtn}
            leftIcon={<Ionicons name="book-outline" size={20} color="#FFF" />}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Button
              title="Retry"
              onPress={handleRetry}
              variant="outline"
              style={{ flex: 1, borderColor: colors.border, backgroundColor: colors.secondaryBackground }}
              textStyle={{ color: colors.text }}
              leftIcon={<Ionicons name="refresh" size={18} color={colors.text} />}
            />
            <Button
              title="Series"
              onPress={handleSeries}
              variant="outline"
              style={{ flex: 1, borderColor: colors.border, backgroundColor: colors.secondaryBackground }}
              textStyle={{ color: colors.text }}
              leftIcon={<Ionicons name="list" size={18} color={colors.text} />}
            />
          </View>

          <Button
            title="Back to Home"
            onPress={() => navigation.navigate('Main', { screen: 'Home' } as any)}
            variant="outline"
            style={{
              marginTop: 16,
              borderColor: colors.border,
              backgroundColor: colors.secondaryBackground,
              alignSelf: 'center',
              minWidth: 160,
              paddingHorizontal: 24
            }}
            textStyle={{ color: colors.textSecondary }}
            leftIcon={<Ionicons name="home-outline" size={18} color={colors.textSecondary} />}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const BentoCard = ({ label, value, icon, color, delay, flex }: any) => {
  const { colors } = useTheme();
  return (
    <View style={{ flex }}>
      <Card style={styles.bentoCardContent} padding={spacing.sm}>
        <Ionicons name={icon} size={24} color={color} style={{ marginBottom: 4 }} />
        <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{label}</Text>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 32, // Balance out back button
  },
  headerTitle: {
    ...typography.headline,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption1,
    marginTop: 2,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  motivationalContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: spacing.lg,
  },
  motivationalText: {
    ...typography.subhead,
    fontWeight: '700',
  },
  timestamp: {
    ...typography.caption2,
    marginTop: 8,
  },
  gridContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bentoCardContent: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    ...typography.title2,
    fontWeight: '700',
  },
  cardLabel: {
    ...typography.caption2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginTop: 2,
  },
  combinedCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 30,
  },
  statValue: {
    ...typography.subhead,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption2,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: spacing.md,
  },
  primaryBtn: {
    height: 52,
    borderRadius: borderRadius.lg,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  textBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  textBtnTitle: {
    ...typography.body,
    fontWeight: '600',
  },
});
