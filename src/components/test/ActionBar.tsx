import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../constants/theme';

interface ActionBarProps {
  onClear: () => void;
  onMarkForReview: () => void;
  isMarked: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  isFirst: boolean;
  isLast: boolean;
  showSubmit?: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onClear,
  onMarkForReview,
  isMarked,
  onNext,
  onPrev,
  onSubmit,
  isFirst,
  isLast,
  showSubmit = false,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      <View style={styles.leftActions}>
        <TouchableOpacity onPress={onClear} style={styles.iconButton}>
          <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.iconText, { color: colors.textSecondary }]}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onMarkForReview} style={styles.iconButton}>
          <Ionicons
            name={isMarked ? "flag" : "flag-outline"}
            size={22}
            color={isMarked ? colors.warning : colors.textSecondary}
          />
          <Text style={[styles.iconText, { color: isMarked ? colors.warning : colors.textSecondary }]}>
            Review
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navActions}>
        <TouchableOpacity
          onPress={onPrev}
          disabled={isFirst}
          style={[
            styles.navButton,
            styles.prevButton,
            {
              borderColor: colors.border,
              opacity: isFirst ? 0.5 : 1
            }
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {showSubmit ? (
          <TouchableOpacity
            onPress={onSubmit}
            style={[styles.submitButton, { backgroundColor: colors.success }]}
          >
            <Text style={[styles.submitText, { color: '#FFFFFF' }]}>Submit Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onNext}
            style={[styles.navButton, styles.nextButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.nextText, { color: '#FFFFFF' }]}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
  },
  leftActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  iconButton: {
    alignItems: 'center',
    gap: 2,
  },
  iconText: {
    ...typography.caption2,
    fontWeight: '500',
  },
  navActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  navButton: {
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    width: 44,
    borderWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  nextText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  submitButton: {
    height: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    ...typography.subhead,
    fontWeight: '700',
  },
});
