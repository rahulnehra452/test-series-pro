import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
  Easing
} from 'react-native-reanimated';
import { borderRadius, spacing, typography, shadows } from '../../constants/theme';


interface StreakCardProps {
  days: number;
  style?: ViewStyle;
  index?: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({ days, style, index = 0 }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
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
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
        </Animated.View>
      </LinearGradient>
    </View>
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
