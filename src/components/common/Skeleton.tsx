import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, DimensionValue, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius } from '../../constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  style?: ViewStyle;
  radius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  style,
  radius
}) => {
  const { colors, isDark } = useTheme();
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const baseColor = isDark ? '#2C2C2E' : '#E5E5EA';

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          backgroundColor: baseColor,
          borderRadius: radius ?? borderRadius.md,
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
