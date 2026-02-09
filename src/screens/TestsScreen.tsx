import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../constants/theme';
import { Input } from '../components/common/Input';
import { TestSeriesCard } from '../components/tests/TestSeriesCard';
import { CategoryPill } from '../components/common/CategoryPill';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTestStore } from '../stores/testStore';

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
  const { history } = useTestStore();

  const filteredTests = MOCK_TEST_SERIES.filter((test) => {
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory;
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTestPress = (id: string, title: string) => {
    // Navigate to TestInterface directly for now as per mock flow
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
        renderItem={({ item }) => (
          <TestSeriesCard
            title={item.title}
            description={item.description}
            category={item.category}
            difficulty={item.difficulty}
            totalTests={item.totalTests}
            totalQuestions={item.totalQuestions}
            duration={item.duration}
            isPurchased={item.isPurchased}
            price={item.price}
            onPress={() => handleTestPress(item.id, item.title)}
            activeAttempt={history.find(h => h.testId === item.id && h.status === 'In Progress')}
          />
        )}
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
});
