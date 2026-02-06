import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../../constants/theme';

interface OptionButtonProps {
  label: string;
  text: string;
  isSelected: boolean;
  onPress: () => void;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  text,
  isSelected,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: isSelected ? colors.selected : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.labelContainer,
          {
            backgroundColor: isSelected ? colors.primary : 'transparent',
            borderColor: isSelected ? colors.primary : colors.textTertiary,
          },
        ]}
      >
        <Text
          style={[
            styles.labelText,
            { color: isSelected ? '#FFFFFF' : colors.textTertiary },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 60,
  },
  labelContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  labelText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  text: {
    ...typography.body,
    flex: 1,
  },
});
