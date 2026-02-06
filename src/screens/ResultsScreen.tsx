import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography, shadows } from '../constants/theme';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Ionicons } from '@expo/vector-icons';

// Mock Data
const MOCK_RESULTS = {
  score: 124,
  totalMarks: 200,
  percentage: 62,
  rank: 156,
  accuracy: 78,
  timeTaken: '58m 20s',
  correct: 62,
  incorrect: 18,
  unanswered: 20,
};

export default function ResultsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleHome = () => {
    (navigation as any).navigate('Main', { screen: 'Home' });
  };

  const handleSolutions = () => {
    // Navigate to solutions view
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Test Results</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>UPSC Prelims 2024 Complete</Text>
      </View>

      <Card style={styles.scoreCard}>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Your Score</Text>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>{MOCK_RESULTS.score}</Text>
          <Text style={[styles.totalScore, { color: colors.textTertiary }]}>/{MOCK_RESULTS.totalMarks}</Text>
        </View>
        <View style={styles.rankBadge}>
          <Ionicons name="trophy" size={16} color="#FFD700" />
          <Text style={[styles.rankText, { color: colors.text }]}>Rank #{MOCK_RESULTS.rank}</Text>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <StatBox label="Accuracy" value={`${MOCK_RESULTS.accuracy}%`} color={colors.primary} />
        <StatBox label="Time" value={MOCK_RESULTS.timeTaken} color={colors.text} />
        <StatBox label="Correct" value={MOCK_RESULTS.correct} color={colors.success} />
        <StatBox label="Wrong" value={MOCK_RESULTS.incorrect} color={colors.error} />
      </View>

      <Card style={styles.breakdownCard}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Subject Breakdown</Text>
        <View style={styles.placeholderChart}>
          <Text style={{ color: colors.textTertiary }}>Chart Placeholder</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title="View Solutions"
          variant="secondary"
          onPress={handleSolutions}
          fullWidth
          style={{ marginBottom: spacing.md }}
        />
        <Button
          title="Return to Home"
          variant="primary"
          onPress={handleHome}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const StatBox = ({ label, value, color }: { label: string, value: string | number, color: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.secondaryBackground }]}>
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
      <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  scoreCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    ...typography.subhead,
    marginBottom: spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  scoreValue: {
    ...typography.largeTitle,
    fontSize: 48,
    fontWeight: '800',
  },
  totalScore: {
    ...typography.title3,
    marginLeft: 4,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  rankText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    minWidth: '40%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statBoxValue: {
    ...typography.title3,
    fontWeight: '700',
    marginBottom: 4,
  },
  statBoxLabel: {
    ...typography.caption2,
  },
  breakdownCard: {
    marginBottom: spacing.xl,
    minHeight: 200,
  },
  cardTitle: {
    ...typography.headline,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  placeholderChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    minHeight: 150,
  },
  actions: {
    marginTop: 'auto',
  },
});
