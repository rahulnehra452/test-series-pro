import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../../constants/theme';
import { Card } from '../common/Card';

interface TestSeriesCardProps {
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  totalTests: number;
  totalQuestions: number;
  duration: number; // minutes
  isPurchased: boolean;
  price?: string;
  onPress: () => void;
}

export const TestSeriesCard: React.FC<TestSeriesCardProps> = ({
  title,
  description,
  category,
  difficulty,
  totalTests,
  totalQuestions,
  duration,
  isPurchased,
  price,
  onPress,
}) => {
  const { colors } = useTheme();

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'Easy': return colors.success;
      case 'Medium': return colors.warning;
      case 'Hard': return colors.error;
    }
  };

  return (
    <Card style={[styles.container, { borderColor: colors.border }]}>
      <TouchableOpacity onPress={onPress}>
        <View style={styles.header}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: colors.secondaryBackground }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{category}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getDifficultyColor() + '20' }]}>
              <Text style={[styles.badgeText, { color: getDifficultyColor() }]}>{difficulty}</Text>
            </View>
          </View>
          {isPurchased && (
            <View style={[styles.checkCircle, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark" size={16} color={colors.success} />
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {description}
        </Text>

        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <StatItem label="Tests" value={totalTests} />
          <StatItem label="Questions" value={totalQuestions} />
          <StatItem label="Mins" value={duration} />
        </View>

        <View style={styles.footer}>
          {isPurchased ? (
            <Text style={[styles.statusText, { color: colors.success }]}>Purchased</Text>
          ) : (
            <Text style={[styles.priceText, { color: colors.primary }]}>{price}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const StatItem = ({ label, value }: { label: string; value: number }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
    padding: spacing.lg, // Increased padding
    borderWidth: 1, // Added border
    borderColor: '#E5E5EA', // Light border
    minHeight: 180, // Consistent height
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md, // Increased spacing
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headline,
    fontWeight: '700',
    marginBottom: 6, // Adjusted spacing
  },
  description: {
    ...typography.subhead,
    marginBottom: spacing.lg, // Increased spacing
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md, // Increased padding
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.callout,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption2,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  statusText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  priceText: {
    ...typography.headline,
    fontWeight: '700',
  },
});
