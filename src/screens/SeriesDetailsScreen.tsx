import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../contexts/ThemeContext';
import { useTestStore } from '../stores/testStore';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList } from '../types/navigationTypes';
import { spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonActivityCard } from '../components/home/SkeletonActivityCard';
import { TestCard } from '../components/tests/TestCard';

type SeriesDetailsRouteProp = RouteProp<RootStackParamList, 'SeriesDetails'>;

export default function SeriesDetailsScreen() {
  const { colors } = useTheme();
  const route = useRoute<SeriesDetailsRouteProp>();
  const navigation = useNavigation<any>();
  const { seriesId, seriesTitle, examId } = route.params;

  const { user } = useAuthStore();
  const isPro = user?.isPro || false;
  const { testSeries, fetchTestSeries, isLoadingTests, history } = useTestStore();

  const currentSeries = useMemo(
    () => testSeries.find(s => s.id === seriesId),
    [seriesId, testSeries]
  );
  const tests = currentSeries?.tests || [];
  const isSeriesLocked = Boolean(currentSeries && currentSeries.price !== 'Free');

  useEffect(() => {
    // Supports direct navigation/deep link by refetching when series data is missing.
    if (!currentSeries && examId) {
      void fetchTestSeries(examId);
    }
  }, [currentSeries, examId, fetchTestSeries]);

  const handleStartTest = (testId: string, testTitle: string, duration: number, isPurchased: boolean) => {
    const activeAttempt = history.find(h => h.testId === testId && h.status === 'In Progress');
    const canAccess =
      isPro ||
      (!isSeriesLocked && isPurchased) ||
      Boolean(activeAttempt);

    if (!canAccess) {
      navigation.navigate('Pricing');
      return;
    }

    navigation.navigate('TestInterface', { testId, testTitle, durationMinutes: duration });
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{seriesTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Included Tests</Text>

        {isLoadingTests && !currentSeries ? (
          [1, 2, 3].map(i => <SkeletonActivityCard key={i} />)
        ) : tests.length > 0 ? (
          tests.map((test) => (
            <View key={test.id}>
              <TestCard
                test={{
                  id: test.id,
                  title: test.title,
                  description: test.description,
                  questions: test.totalQuestions,
                  duration: test.duration,
                  difficulty: test.difficulty,
                  category: test.category,
                  attempts: 0
                }}
                onPress={() => handleStartTest(test.id, test.title, test.duration, test.isPurchased)}
              />
              {!isPro && (isSeriesLocked || !test.isPurchased) && (
                <View style={styles.lockHintRow}>
                  <Ionicons name="lock-closed" size={14} color={colors.warning} />
                  <Text style={[styles.lockHintText, { color: colors.warning }]}>
                    Requires Pro to start this test
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <EmptyState
            icon="document-text-outline"
            title={currentSeries ? "No Tests Available" : "Series Not Loaded"}
            description={
              currentSeries
                ? "This series doesn't have any tests yet."
                : "Open this series from the Exam page once, or refresh to load it."
            }
          />
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.headline,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md
  },
  sectionTitle: {
    ...typography.title3,
    marginBottom: spacing.xs,
  },
  lockHintRow: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockHintText: {
    ...typography.caption1,
    fontWeight: '600',
  },
});
