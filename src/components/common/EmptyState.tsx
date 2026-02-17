import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  variant?: 'full' | 'inline';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'albums-outline',
  actionLabel,
  onAction,
  style,
  variant = 'full', // 'full' or 'inline'
}) => {
  const { colors } = useTheme();
  const isInline = variant === 'inline';

  return (
    <View style={[
      styles.container,
      isInline && styles.inlineContainer,
      style
    ]}>
      <View style={[
        styles.iconContainer,
        { backgroundColor: colors.secondaryBackground },
        isInline && styles.inlineIconContainer
      ]}>
        <Ionicons
          name={icon}
          size={isInline ? 24 : 48}
          color={colors.textSecondary}
        />
      </View>

      {title && (
        <Text style={[
          styles.title,
          { color: colors.text },
          isInline && styles.inlineTitle
        ]}>
          {title}
        </Text>
      )}

      <Text style={[
        styles.description,
        { color: colors.textSecondary },
        isInline && styles.inlineDescription
      ]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          size={isInline ? "sm" : "md"}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  inlineContainer: {
    padding: spacing.md,
    marginTop: 0,
    flexDirection: 'column',
    gap: spacing.xs,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  inlineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title3,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  inlineTitle: {
    ...typography.headline,
    marginBottom: 0,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 250,
  },
  inlineDescription: {
    ...typography.caption1,
    marginBottom: spacing.sm,
    maxWidth: '100%',
  },
  button: {
    minWidth: 150,
  },
});
