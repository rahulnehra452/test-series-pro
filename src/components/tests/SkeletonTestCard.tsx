import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import { Card } from '../common/Card';

const { width } = Dimensions.get('window');

export const SkeletonTestCard = () => {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const bg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <Card style={[styles.container, { borderColor: colors.border }]}>
      {/* Header Badges */}
      <View style={styles.header}>
        <Animated.View style={[styles.skeletonBlock, { width: 60, height: 20, backgroundColor: bg }, animatedStyle]} />
        <Animated.View style={[styles.skeletonBlock, { width: 50, height: 20, backgroundColor: bg }, animatedStyle]} />
      </View>

      {/* Title */}
      <Animated.View style={[styles.skeletonBlock, { width: '70%', height: 24, marginBottom: 8, backgroundColor: bg }, animatedStyle]} />

      {/* Description */}
      <Animated.View style={[styles.skeletonBlock, { width: '90%', height: 14, marginBottom: 4, backgroundColor: bg }, animatedStyle]} />
      <Animated.View style={[styles.skeletonBlock, { width: '60%', height: 14, marginBottom: 16, backgroundColor: bg }, animatedStyle]} />

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <Animated.View style={[styles.skeletonBlock, { width: 40, height: 30, backgroundColor: bg }, animatedStyle]} />
        <Animated.View style={[styles.skeletonBlock, { width: 40, height: 30, backgroundColor: bg }, animatedStyle]} />
        <Animated.View style={[styles.skeletonBlock, { width: 40, height: 30, backgroundColor: bg }, animatedStyle]} />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Animated.View style={[styles.skeletonBlock, { width: 80, height: 30, borderRadius: 15, backgroundColor: bg }, animatedStyle]} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
    padding: spacing.lg,
    borderWidth: 1,
    minHeight: 180,
  },
  header: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  skeletonBlock: {
    borderRadius: borderRadius.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  footer: {
    alignItems: 'flex-end',
  },
});
