import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ProgressStatProps {
  label: string;
  value: string;
  subValue?: string;
  index: number;
}

const StatItem: React.FC<ProgressStatProps> = ({ label, value, subValue, index }) => {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100 + 200).springify()}
      style={[
        styles.statItem,
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        }
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      {subValue && (
        <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>{subValue}</Text>
      )}
    </Animated.View>
  );
};

export const ProgressGrid: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Animated.Text
        entering={FadeInDown.delay(100).duration(400)}
        style={[styles.sectionTitle, { color: colors.text }]}
      >
        Your Progress
      </Animated.Text>
      <View style={styles.grid}>
        <StatItem label="Tests" value="0" subValue="Completed" index={0} />
        <StatItem label="Average" value="0%" subValue="Score" index={1} />
        <StatItem label="Rank" value="#156" subValue="Overall" index={2} />
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
