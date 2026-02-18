import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, shadows, spacing } from '../../constants/theme';



interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  style?: StyleProp<ViewStyle>;
  padding?: number;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  style,
  padding = spacing.base,
  onPress,
  ...props
}) => {
  const { colors, theme } = useTheme();

  const getBackgroundColor = () => {
    if (variant === 'outlined') return 'transparent';
    if (variant === 'flat') return colors.secondaryBackground;
    return colors.card;
  };

  const getShadow = () => {
    if (variant !== 'elevated') return {};
    return theme === 'dark' ? shadows.dark.sm : shadows.light.sm;
  };

  const getBorder = () => {
    if (variant === 'outlined')
      return {
        borderWidth: 1,
        borderColor: colors.border,
      };
    return {};
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: getBackgroundColor(),
      padding,
      ...getShadow(),
      ...getBorder(),
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={containerStyle} activeOpacity={0.7} {...props}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={containerStyle}
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
