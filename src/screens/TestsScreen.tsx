import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../constants/theme';
import { Input } from '../components/common/Input';
import { TestSeriesCard } from '../components/tests/TestSeriesCard';
import { CategoryPill } from '../components/common/CategoryPill';
import { EmptyState } from '../components/common/EmptyState';
import type { RootStackParamList } from '../types/navigationTypes';
import { useTestStore } from '../stores/testStore';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { SkeletonTestCard } from '../components/tests/SkeletonTestCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScaleButton } from '../components/common/ScaleButton';

export default function TestsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    history,
    testSeries,
    isLoadingTests,
    fetchTestSeries
  } = useTestStore();

  const { user } = useAuthStore();
  const isPro = user?.isPro || false;

  useEffect(() => {
    fetchTestSeries();
  }, [fetchTestSeries]);

  /* Search Debounce */
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = React.useCallback(() => {
    fetchTestSeries();
  }, [fetchTestSeries]);

  const displaySeries = testSeries.length > 0
    ? testSeries
    : [];
  const isInitialLoading = isLoadingTests && testSeries.length === 0;

  const dynamicCategories = React.useMemo(() => {
    const cats = new Set<string>();
    testSeries.forEach(series => {
      series.tests?.forEach(t => {
        if (t.category) cats.add(t.category);
      });
    });
    return ['All', ...Array.from(cats)];
  }, [testSeries]);

  const filteredSeries = displaySeries.filter((series) => {
    const matchesCategory = selectedCategory === 'All' || series.tests?.some(t => t.category === selectedCategory);
    const matchesSearch = series.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTestPress = (id: string, title: string, examId: string) => {
    navigation.navigate('SeriesDetails', { seriesId: id, seriesTitle: title, examId: examId || '' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Test Series</Text>
        <Input
          placeholder="Search tests..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchBar}
        />

        <FlatList
          horizontal
          data={dynamicCategories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <CategoryPill
              label={item}
              isSelected={selectedCategory === item}
              onPress={() => setSelectedCategory(item)}
            />
          )}
        />
      </View>

      <FlatList
        data={filteredSeries}
        keyExtractor={(item) => item.id}
        refreshing={!!isLoadingTests}
        onRefresh={onRefresh}
        ListHeaderComponent={
          isInitialLoading ? (
            <View>
              {[1, 2, 3].map(i => <SkeletonTestCard key={i} />)}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isInitialLoading ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                title={searchQuery ? 'No results found' : 'No tests available'}
                description={searchQuery ? 'Try adjusting your search terms' : 'Check back later for new test series'}
                icon="search-outline"
                actionLabel={!searchQuery ? "Retry Fetch" : undefined}
                onAction={!searchQuery ? onRefresh : undefined}
              />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const isPurchased = isPro || item.price === 'Free';
          const totalQuestions = item.tests?.reduce((sum, t) => sum + (t.totalQuestions || 0), 0) || 0;
          const duration = item.tests?.reduce((sum, t) => sum + (t.duration || 0), 0) || 0;

          return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
              <TestSeriesCard
                title={item.title}
                description={item.description}
                category="Series"
                difficulty="Medium"
                totalTests={item.tests?.length || 0}
                totalQuestions={totalQuestions}
                duration={duration}
                isPurchased={isPurchased}
                price={item.price !== 'Free' ? item.price : undefined}
                onPress={() => handleTestPress(item.id, item.title, item.examId || '')}
              />
            </Animated.View>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.largeTitle,
    marginBottom: spacing.md,
  },
  searchBar: {
    marginBottom: spacing.md,
  },
  categoriesList: {
    paddingRight: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
