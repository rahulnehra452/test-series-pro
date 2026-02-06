import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToastStore } from '../../stores/toastStore';
import { borderRadius, shadows, spacing, typography } from '../../constants/theme';

export const Toast = () => {
  const { visible, message, type, hideToast } = useToastStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const getIconName = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return '#34C759'; // iOS Green
      case 'error': return '#FF3B30'; // iOS Red
      default: return '#007AFF'; // iOS Blue
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      exiting={FadeOutUp}
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          backgroundColor: colors.card,
          borderColor: colors.border
        }
      ]}
    >
      <View style={[styles.content, { borderLeftColor: getIconColor() }]}>
        <Ionicons name={getIconName()} size={24} color={getIconColor()} />
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    borderRadius: borderRadius.lg,
    ...shadows.light.lg,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderLeftWidth: 4,
    borderRadius: borderRadius.lg,
  },
  message: {
    ...typography.subhead,
    fontWeight: '600',
    flex: 1,
  },
});
