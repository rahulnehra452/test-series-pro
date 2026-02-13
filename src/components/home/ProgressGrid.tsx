import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useTestStore } from '../../stores/testStore';
import { borderRadius, spacing, typography } from '../../constants/theme';


interface ProgressStatProps {
  label: string;
  value: string;
  subValue?: string;
  index: number;
  customStyle?: ViewStyle;
}

const StatItem: React.FC<ProgressStatProps> = ({ label, value, subValue, index, customStyle }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.statItem,
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        customStyle
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      {subValue && (
        <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>{subValue}</Text>
      )}
    </View>
  );
};

export const ProgressGrid: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { history } = useTestStore();

  // Calculate metrics
  const completedAttempts = history.filter(h => h.status === 'Completed');
  const completedTestsCount = completedAttempts.length;

  const totalQuestions = completedAttempts.reduce((acc, curr) => {
    // Count questions actually answered (non-null/undefined)
    const answeredCount = Object.values(curr.answers).filter(a => a !== undefined && a !== null).length;
    return acc + answeredCount;
  }, 0);

  const averageScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedAttempts.length)
    : 0;

  return (
    <View style={styles.container}>
      <Text
        style={[styles.sectionTitle, { color: colors.text }]}
      >
        Your Progress
      </Text>
      <View style={styles.grid}>
        <StatItem
          label="Tests"
          value={completedTestsCount.toString()}
          subValue="Completed"
          index={0}
        />
        <StatItem
          label="Average"
          value={`${averageScore}%`}
          subValue="Score"
          index={1}
        />
        <StatItem
          label="Questions"
          value={totalQuestions.toString()}
          subValue="Solved"
          index={2}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    ...typography.title3,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  statLabel: {
    ...typography.caption1,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...typography.title2,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statSubValue: {
    ...typography.caption2,
  },
});
