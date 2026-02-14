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
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTestStore } from '../stores/testStore';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { SkeletonTestCard } from '../components/tests/SkeletonTestCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScaleButton } from '../components/common/ScaleButton';

// Mock Data
export const CATEGORIES = ['All', 'UPSC', 'SSC', 'Banking', 'Railways', 'State PCS'];
export const MOCK_TEST_SERIES = [
  {
    id: 'upsc-pre-2024',
    title: 'UPSC Prelims 2024 Test Series',
    description: 'Comprehensive test series for UPSC CSE Prelims 2024 including GS and CSAT papers.',
    category: 'UPSC',
    difficulty: 'Hard' as const,
    totalTests: 30,
    totalQuestions: 100,
    duration: 120,
    isPurchased: true,
  },
  {
    id: 'ssc-cgl-tier1',
    title: 'SSC CGL Tier I Full Length Mocks',
    description: 'Based on latest pattern. Includes previous year questions.',
    category: 'SSC',
    difficulty: 'Medium' as const,
    totalTests: 20,
    totalQuestions: 100,
    duration: 60,
    isPurchased: false,
    price: '₹499',
  },
  {
    id: 'sbi-po-pre',
    title: 'SBI PO Prelims 2024',
    description: 'High level puzzles and DI questions for SBI PO preparation.',
    category: 'Banking',
    difficulty: 'Hard' as const,
    totalTests: 15,
    totalQuestions: 100,
    duration: 60,
    isPurchased: false,
    price: '₹399',
  },
  {
    id: 'rrb-ntpc',
    title: 'RRB NTPC CBT 2',
    description: 'Focus on General Awareness and Mathematics.',
    category: 'Railways',
    difficulty: 'Medium' as const,
    totalTests: 10,
    totalQuestions: 120,
    duration: 90,
    isPurchased: true,
  },
];

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

  const displayTests = tests.length > 0 ? tests : MOCK_TEST_SERIES;
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
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No tests match your search' : 'No tests available right now'}
              </Text>
              {!searchQuery && (
                <ScaleButton
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={onRefresh}
                >
                  <Text style={styles.retryText}>Retry Fetch</Text>
                </ScaleButton>
              )}
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
    fontWeight: '700',
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
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  retryButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
});
