import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../../constants/theme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ContinueLearningProps {
  title: string;
  progress: number;
  totalTests: number;
  completedTests: number;
  onPress: () => void;
}

export const ContinueLearning: React.FC<ContinueLearningProps> = ({
  title,
  progress,
  totalTests,
  completedTests,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(600).springify()}
      style={styles.container}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Learning</Text>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              {completedTests} of {totalTests} tests completed
            </Text>
          </View>
          <View style={[styles.progressCircle, { borderColor: colors.secondaryBackground }]}>
            <Text style={[styles.progressText, { color: colors.text }]}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        <View style={[styles.progressBarBg, { backgroundColor: colors.secondaryBackground }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${progress * 100}%`
              }
            ]}
          />
        </View>

        <Button
          title="Continue"
          onPress={onPress}
          style={styles.button}
          fullWidth
        />
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.title3,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headline,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subhead,
  },
  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  button: {
    marginTop: spacing.xs,
  },
});
