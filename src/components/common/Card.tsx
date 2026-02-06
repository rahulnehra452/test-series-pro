import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, shadows, spacing } from '../../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  style?: ViewStyle;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  style,
  padding = spacing.base,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  const getBackgroundColor = () => {
    return colors.card;
  };

  const getShadow = () => {
    if (variant !== 'elevated') return {};
    return isDark ? shadows.dark.sm : shadows.light.sm;
  };

  const getBorder = () => {
    if (variant === 'outlined')
      return {
        borderWidth: 1,
        borderColor: colors.border,
      };
    return {};
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          padding,
          ...getShadow(),
          ...getBorder(),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
  },
});
