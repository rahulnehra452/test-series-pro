import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../contexts/ThemeContext';
import { useTestStore } from '../stores/testStore';
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
  const { seriesId, seriesTitle } = route.params;

  // We need a way to fetch tests for a specific series.
  // Currently, fetchTests fetches ALL tests.
  // We should add fetchTestsBySeries to testStore, or filter the existing tests if they are already loaded nested in series.
  // Let's assume testStore.testSeries has the tests nested from the previous screen fetch, OR we fetch them.
  // Using the store's `testSeries` state is efficient if we just came from ExamDetails.

  const { testSeries } = useTestStore();

  const currentSeries = testSeries.find(s => s.id === seriesId);
  const tests = currentSeries?.tests || [];

  const handleStartTest = (testId: string, testTitle: string, duration: number) => {
    navigation.navigate('TestInterface', { testId, testTitle });
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

        {tests.length > 0 ? (
          tests.map((test) => (
            <TestCard
              key={test.id}
              test={{
                id: test.id,
                title: test.title,
                description: test.description,
                questions: test.totalQuestions,
                duration: test.duration,
                difficulty: test.difficulty,
                category: test.category,
                attempts: 0 // We might need to fetch attempt count separately or include it in the join
              }}
              onPress={() => handleStartTest(test.id, test.title, test.duration)}
            />
          ))
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="No Tests Available"
            description="This series doesn't have any tests yet."
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
});
