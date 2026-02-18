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
import { runtimeConfig } from '../config/runtimeConfig';
import { CATEGORIES, MOCK_TEST_SERIES } from '../data/mockTests';

// Mock Data Handled via Import

export default function TestsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    history,
    tests,
    isLoadingTests,
    fetchTests
  } = useTestStore();

  const { user } = useAuthStore();
  const isPro = user?.isPro || false;

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  /* Search Debounce */
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = React.useCallback(() => {
    fetchTests(true);
  }, [fetchTests]);

  const shouldUseMockFallback = runtimeConfig.features.allowMockFallback;
  const displayTests = tests.length > 0
    ? tests
    : (shouldUseMockFallback ? MOCK_TEST_SERIES : []);
  const isInitialLoading = isLoadingTests && tests.length === 0;

  const filteredTests = displayTests.filter((test) => {
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory;
    const matchesSearch = test.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTestPress = (id: string, title: string, canAccess: boolean) => {
    if (!canAccess) {
      navigation.navigate('Pricing');
      return;
    }
    navigation.navigate('TestInterface', { testId: id, testTitle: title });
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
          data={CATEGORIES}
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
        data={filteredTests}
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
          const activeAttempt = history.find(h => h.testId === item.id && h.status === 'In Progress');
          const canAccess = isPro || item.isPurchased || Boolean(activeAttempt);

          return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
              <TestSeriesCard
                title={item.title}
                description={item.description}
                category={item.category}
                difficulty={item.difficulty}
                totalTests={item.totalTests}
                totalQuestions={item.totalQuestions}
                duration={item.duration}
                isPurchased={isPro || item.isPurchased}
                price={item.price}
                onPress={() => handleTestPress(item.id, item.title, canAccess)}
                activeAttempt={activeAttempt}
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
