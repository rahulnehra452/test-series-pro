import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../contexts/ThemeContext';
import { useTestStore } from '../stores/testStore';
import { RootStackParamList } from '../types/navigationTypes';
import { spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonActivityCard } from '../components/home/SkeletonActivityCard';

type ExamDetailsRouteProp = RouteProp<RootStackParamList, 'ExamDetails'>;

export default function ExamDetailsScreen() {
  const { colors } = useTheme();
  const route = useRoute<ExamDetailsRouteProp>();
  const navigation = useNavigation<any>();
  const { examId, examTitle } = route.params;
  const { testSeries, fetchTestSeries, isLoadingTests } = useTestStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    fetchTestSeries(examId);
  }, [examId, fetchTestSeries]);

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await fetchTestSeries(examId);
    setIsRefreshing(false);
  }, [fetchTestSeries, examId]);

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{examTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Series</Text>

        {isLoadingTests && testSeries.length === 0 ? (
          [1, 2, 3].map(i => <SkeletonActivityCard key={i} />)
        ) : testSeries.length > 0 ? (
          testSeries.map((series) => (
            <TouchableOpacity
              key={series.id}
              style={[styles.seriesCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('SeriesDetails', { seriesId: series.id, seriesTitle: series.title })}
            >
              <View style={styles.seriesImageContainer}>
                {series.coverImage ? (
                  <Image source={{ uri: series.coverImage }} style={styles.seriesImage} />
                ) : (
                  <View style={[styles.placeholderImage, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="documents" size={32} color={colors.primary} />
                  </View>
                )}
              </View>
              <View style={styles.seriesContent}>
                <Text style={[styles.seriesTitle, { color: colors.text }]}>{series.title}</Text>
                <Text style={[styles.seriesMeta, { color: colors.textSecondary }]}>
                  {series.tests?.length || 0} Tests • {series.price === 'Free' ? 'Free' : series.price}
                </Text>
                {series.description ? (
                  <Text numberOfLines={2} style={[styles.seriesDescription, { color: colors.textSecondary }]}>
                    {series.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            icon="albums-outline"
            title="No Test Series Found"
            description={`We are adding content for ${examTitle} soon.`}
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
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.title3,
    marginBottom: spacing.md,
  },
  seriesCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  seriesImageContainer: {
    marginRight: spacing.md,
  },
  seriesImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesContent: {
    flex: 1,
  },
  seriesTitle: {
    ...typography.headline,
    fontSize: 16,
    marginBottom: 4,
  },
  seriesMeta: {
    ...typography.caption1,
    marginBottom: 4,
  },
  seriesDescription: {
    ...typography.caption2,
  },
});
