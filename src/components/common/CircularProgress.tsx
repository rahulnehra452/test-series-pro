import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useTheme } from '../../contexts/ThemeContext';
import { typography } from '../../constants/theme';



interface CircularProgressProps {
  score: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  duration?: number;
}

export const CircularProgress = ({
  score,
  total,
  size = 200,
  strokeWidth = 20,
  duration = 1500,
}: CircularProgressProps) => {
  const { colors, isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp progress between 0 and 1 for visual ring
  const progress = Math.max(0, Math.min(1, score / total));
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.primaryLight} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.15)' : colors.border}
          strokeWidth={strokeWidth}
          strokeOpacity={1}
          opacity={1}
          fill="none"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          fill="none"
        />
      </Svg>
      <View style={styles.content}>
        <Text style={[styles.score, { color: colors.text }]}>{score}</Text>
        <Text style={[styles.total, { color: colors.textSecondary }]}>/{total}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    ...typography.largeTitle,
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56, // Fixed line height to prevent overlap
  },
  total: {
    ...typography.title3,
    fontSize: 20,
    fontWeight: '600',
    marginTop: -4,
  },
});
