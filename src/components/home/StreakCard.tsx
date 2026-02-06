import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, typography, shadows } from '../../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface StreakCardProps {
  days: number;
  style?: ViewStyle;
  index?: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({ days, style, index = 0 }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={[styles.wrapper, style]}
    >
      <LinearGradient
        colors={['#5B7BF5', '#6B8AFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.label}>🔥 Current Streak</Text>
          </View>
          <Text style={styles.days}>{days} Days</Text>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...shadows.light.md,
  },
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.subhead,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  days: {
    ...typography.title1,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
