import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';

const { width } = Dimensions.get('window');

export const SkeletonActivityCard = () => {
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
    <View style={[styles.container, { backgroundColor: colors.secondaryBackground }]}>
      <View style={styles.leftCol}>
        {/* Title Pulse */}
        <Animated.View
          style={[
            styles.skeletonLine,
            { width: '70%', height: 16, backgroundColor: bg },
            animatedStyle,
          ]}
        />
        {/* Date Pulse */}
        <Animated.View
          style={[
            styles.skeletonLine,
            { width: '40%', height: 12, marginTop: 8, backgroundColor: bg },
            animatedStyle,
          ]}
        />
      </View>

      {/* Score Pulse */}
      <Animated.View
        style={[
          styles.skeletonBox,
          { width: 40, height: 24, backgroundColor: bg },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leftCol: {
    flex: 1,
    marginRight: 16,
  },
  skeletonLine: {
    borderRadius: borderRadius.sm,
  },
  skeletonBox: {
    borderRadius: borderRadius.sm,
  },
});
