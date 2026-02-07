import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography } from '../constants/theme';
import { Input } from '../components/common/Input';
// Removed FlashList due to installation issues
// import { FlashList } from '@shopify/flash-list';

// Components
import { CategoryPill } from '../components/tests/CategoryPill';
import { TestSeriesCard } from '../components/tests/TestSeriesCard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// Mock Data
const CATEGORIES = ['All', 'UPSC', 'SSC', 'Banking', 'Railways', 'State PCS'];

const MOCK_TEST_SERIES = [
  {
    id: '1',
    title: 'UPSC Prelims 2024 Complete',
    description: 'Comprehensive test series covering all subjects for UPSC Prelims',
    category: 'UPSC',
    difficulty: 'Hard' as const,
    totalTests: 30,
    totalQuestions: 3000,
    duration: 120,
    isPurchased: true,
    price: '₹2999',
  },
  {
    id: '2',
    title: 'SSC CGL Tier 1 Practice',
    description: 'Full-length mock tests for SSC CGL Tier 1 examination',
    category: 'SSC',
    difficulty: 'Medium' as const,
    totalTests: 20,
    totalQuestions: 2000,
    duration: 60,
    isPurchased: true,
    price: '₹999',
  },
  {
    id: '3',
    title: 'Banking Awareness Complete',
    description: 'Essential banking awareness questions for IBPS/SBI exams',
    category: 'Banking',
    difficulty: 'Easy' as const,
    totalTests: 15,
    totalQuestions: 750,
    duration: 30,
    isPurchased: true,
    price: '₹499',
  },
  // ... existing tests ...
  {
    id: '4',
    title: 'RRB NTPC CBT-2 Mock',
    description: 'High-yield mock test for Railway Recruitment Board exams',
    category: 'Railways',
    difficulty: 'Medium' as const,
    totalTests: 12,
    totalQuestions: 1440,
    duration: 90,
    isPurchased: false,
    price: '₹399',
  },
  {
    id: '5',
    title: 'UPPSC Prelims 2024',
    description: 'Full syllabus coverage for Uttar Pradesh Public Service Commission',
    category: 'State PCS',
    difficulty: 'Hard' as const,
    totalTests: 25,
    totalQuestions: 3750,
    duration: 120,
    isPurchased: true,
    price: '₹1499',
  },
  {
    id: '6',
    title: 'RBI Grade B Phase 1',
    description: 'Specialized test series for RBI Grade B officers exam',
    category: 'Banking',
    difficulty: 'Hard' as const,
    totalTests: 10,
    totalQuestions: 2000,
    duration: 120,
    isPurchased: false,
    price: '₹1999',
  },
  {
    id: '7',
    title: 'SSC CHSL Tier 1',
    description: 'Targeted practice for Combined Higher Secondary Level exam',
    category: 'SSC',
    difficulty: 'Medium' as const,
    totalTests: 15,
    totalQuestions: 1500,
    duration: 60,
    isPurchased: true,
    price: '₹699',
  },
  {
    id: '8',
    title: 'CSAT Compendium',
    description: 'Dedicated tests for UPSC Paper II (CSAT)',
    category: 'UPSC',
    difficulty: 'Medium' as const,
    totalTests: 8,
    totalQuestions: 640,
    duration: 120,
    isPurchased: true,
    price: '₹999',
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TestsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTests = MOCK_TEST_SERIES.filter((test) => {
    const matchesCategory = selectedCategory === 'All' || test.category === CATEGORIES.find(c => c === selectedCategory);
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTestPress = (testId: string, testTitle: string) => {
    navigation.navigate('TestInterface', { testId, testTitle });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Test Series</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            Explore and take practice tests
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Input
            placeholder="Search test series..."
            leftIcon="search"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                isActive={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
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
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.largeTitle,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...typography.body,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoriesContainer: {
    marginBottom: spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 100,
  },
});
