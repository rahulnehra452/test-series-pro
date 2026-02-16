import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../constants/theme';
import { formatTime } from '../../utils/helpers'; // Assuming helpers.ts exists as seen earlier

interface TestHeaderProps {
  timeRemaining: number;
  currentIndex: number;
  totalQuestions: number;
  onPause: () => void;
  onOpenPalette?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  onLearn?: () => void;
  isLearn?: boolean;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  timeRemaining,
  currentIndex,
  totalQuestions,
  onPause,
  onOpenPalette,
  onBookmark,
  isBookmarked,
  onLearn,
  isLearn,
}) => {
  const { colors } = useTheme();
  const isLowTime = timeRemaining < 300; // 5 mins

  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.timerContainer}>
        <Ionicons name="time-outline" size={20} color={isLowTime ? colors.error : colors.text} />
        <Text
          style={[
            styles.timerText,
            { color: isLowTime ? colors.error : colors.text }
          ]}
        >
          {timeString}
        </Text>
      </View>

      <Text style={[styles.counterText, { color: colors.textSecondary }]}>
        Q {currentIndex + 1}/{totalQuestions}
      </Text>

      <View style={styles.rightButtons}>
        {onLearn && (
          <TouchableOpacity onPress={onLearn} style={styles.menuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={isLearn ? "bulb" : "bulb-outline"}
              size={24}
              color={isLearn ? colors.warning : colors.text} // Yellow for active
            />
          </TouchableOpacity>
        )}
        {onBookmark && (
          <TouchableOpacity onPress={onBookmark} style={styles.menuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isBookmarked ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onOpenPalette} style={styles.menuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="grid-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPause} style={styles.menuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="pause-circle-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    ...typography.headline,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  counterText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  menuButton: {
    padding: 4,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // Increased from 8 for better separation
  },
});
