import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../constants/theme';
import { Button } from '../components/common/Button';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { Card } from '../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { useTestStore } from '../stores/testStore';
import { TestAttempt } from '../types';
import { getQuestionsForTest } from '../data/mockQuestions';
import { CircularProgress } from '../components/common/CircularProgress';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { ScaleButton } from '../components/common/ScaleButton';
import { getScoreConfig, getScorePercentage } from '../utils/score';

export default function ResultsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { result, attemptId } = (route.params as { result?: TestAttempt; attemptId?: string }) || {};
  const { history } = useTestStore();

  const attempt = result || history.find(h => h.id === attemptId);

  // Re-fetch calculations
  const questions = useMemo(() => {
    if (!attempt) return [];
    if (attempt.questions && attempt.questions.length > 0) return attempt.questions;
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
    skipped = questions.length - attempted;

    return { correct, incorrect, skipped, attempted, total: questions.length };
  }, [attempt, questions]);

  // Haptics
  useEffect(() => {
    if (attempt && attempt.totalMarks > 0) {
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
        <Button title="Go Home" onPress={() => navigation.navigate('Main', { screen: 'Home' })} />
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
  // Progress & Message
  const scorePercentage = getScorePercentage(attempt.score, attempt.totalMarks);
  const scoreConfig = getScoreConfig(scorePercentage, colors);

  // Time String
  const durationMs = (attempt.endTime || Date.now()) - attempt.startTime;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  const timeString = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  // Messaging Logic - Override text if needed, or use defaults
  const getMessage = () => {
    // Custom messages per tier
    switch (scoreConfig.status) {
      case 'poor': return { text: "Review & Learn 📚", color: scoreConfig.color };
      case 'average': return { text: "Keep Practicing 💪", color: scoreConfig.color };
      case 'good': return { text: "Good Progress 📈", color: scoreConfig.color };
      case 'excellent': return { text: "Excellent Work! 🎉", color: scoreConfig.color };
    }
  };
  const message = getMessage();

  const handleSolutions = () => navigation.navigate('Solutions', { attemptId: attempt.id });

  const handleRetry = () => {
    Alert.alert(
      "Retry Test",
      "Are you sure? Your current results for this attempt will be discarded.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Retry", style: "destructive", onPress: () => navigation.replace('TestInterface', { testId: attempt.testId, testTitle: attempt.testTitle }) }
      ]
    );
  };

  const handleSeries = () => navigation.goBack();

  // Timestamp
  const timeAgo = new Date(attempt.endTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'android' ? 60 : 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <ScreenHeader
          title="Test Results"
          subtitle={`${attempt.testTitle} • ${stats.attempted} of ${stats.total} attempted`}
          showBack
          onBack={handleSeries}
        />

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <CircularProgress
            score={attempt.score}
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
          {/* Marks Breakdown Card */}
          <Card style={styles.breakdownCard} padding={spacing.md}>
            <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>Score Breakdown</Text>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownLabel, { color: colors.textTertiary }]}>Potential</Text>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[styles.breakdownValue, { color: colors.success }]}>+</Text>
                  <AnimatedCounter
                    value={stats.correct * 2}
                    style={[styles.breakdownValue, { color: colors.success }]}
                  />
                </View>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownLabel, { color: colors.textTertiary }]}>Penalty</Text>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[styles.breakdownValue, { color: colors.error }]}>-</Text>
                  <AnimatedCounter
                    value={stats.incorrect * 0.66}
                    precision={2}
                    style={[styles.breakdownValue, { color: colors.error }]}
                  />
                </View>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownLabel, { color: colors.textTertiary }]}>Net Score</Text>
                <AnimatedCounter
                  value={attempt.score}
                  style={[styles.breakdownValue, { color: attempt.score >= 0 ? colors.primary : colors.error }]}
                />
              </View>
            </View>
          </Card>

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
                <View style={{ marginLeft: spacing.sm }}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{timeString}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time Taken</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.statItem}>
                <Ionicons name="stats-chart" size={20} color={colors.warning} />
                <View style={{ marginLeft: 8 }}>
                  <View style={{ flexDirection: 'row' }}>
                    <AnimatedCounter
                      value={accuracy}
                      style={[styles.statValue, { color: colors.text }]}
                    />
                    <Text style={[styles.statValue, { color: colors.text }]}>%</Text>
                  </View>
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

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
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
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={{
              marginTop: spacing.base,
              borderColor: colors.border,
              backgroundColor: colors.secondaryBackground,
              alignSelf: 'center',
              minWidth: 160,
              paddingHorizontal: spacing.xl
            }}
            textStyle={{ color: colors.textSecondary }}
            leftIcon={<Ionicons name="home-outline" size={18} color={colors.textSecondary} />}
          />
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

const BentoCard = ({ label, value, icon, color, delay, flex }: any) => {
  const { colors } = useTheme();
  return (
    <View style={{ flex }}>
      <Card style={styles.bentoCardContent} padding={spacing.sm}>
        <Ionicons name={icon} size={24} color={color} style={{ marginBottom: spacing.xs }} />
        <AnimatedCounter
          value={value}
          delay={delay}
          style={[styles.cardValue, { color: colors.text }]}
        />
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

  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  motivationalContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginTop: spacing.lg,
  },
  motivationalText: {
    ...typography.headline,
  },
  timestamp: {
    ...typography.caption2,
    marginTop: spacing.sm,
  },
  gridContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  breakdownCard: {
    marginBottom: spacing.sm,
  },
  breakdownTitle: {
    ...typography.caption1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    ...typography.caption2,
    marginBottom: spacing.xs,
  },
  breakdownValue: {
    ...typography.title2,
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
    paddingVertical: spacing.base,
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
    ...typography.headline,
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
    marginTop: spacing.sm,
  },
  textBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  textBtnTitle: {
    ...typography.headline,
  },
});
