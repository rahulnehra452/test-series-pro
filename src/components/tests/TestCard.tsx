import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface TestCardProps {
  test: {
    id: string;
    title: string;
    description: string;
    questions: number;
    duration: number;
    difficulty: string;
    category: string;
    attempts?: number;
  };
  onPress: () => void;
}

export const TestCard = ({ test, onPress }: TestCardProps) => {
  const { colors } = useTheme();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return colors.success;
      case 'medium': return colors.warning;
      case 'hard': return colors.error;
      default: return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{test.title}</Text>
          <View style={[styles.badge, { backgroundColor: getDifficultyColor(test.difficulty) + '20' }]}>
            <Text style={[styles.badgeText, { color: getDifficultyColor(test.difficulty) }]}>
              {test.difficulty}
            </Text>
          </View>
        </View>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {test.description}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{test.questions} Qs</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{test.duration} mins</Text>
        </View>
        <View style={styles.startButton}>
          <Text style={[styles.startText, { color: colors.primary }]}>Start</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.headline,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption2,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    ...typography.caption1,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  statText: {
    ...typography.caption1,
    marginLeft: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  startText: {
    ...typography.subhead,
    fontWeight: '600',
    marginRight: 4,
  },
});
