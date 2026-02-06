import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography, colors as themeColors } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

// Types
interface KnowledgeItem {
  id: string;
  question: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'saved' | 'wrong' | 'learn';
  date: string;
  note?: string;
}

// Mock Data
const SUBJECTS = ['All', 'Polity', 'History', 'Economy', 'Geography', 'Quant', 'Current Affairs'];

const MOCK_DATA: KnowledgeItem[] = [
  {
    id: '1',
    question: 'Which article of the constitution deals with fundamental rights?',
    subject: 'Polity',
    difficulty: 'Medium',
    type: 'saved',
    date: '2 hours ago',
  },
  {
    id: '2',
    question: 'The Harappan civilization was first discovered in...',
    subject: 'History',
    difficulty: 'Easy',
    type: 'wrong',
    date: '1 day ago',
  },
  {
    id: '3',
    question: 'Concept of Repo Rate and its impact on inflation.',
    subject: 'Economy',
    difficulty: 'Hard',
    type: 'learn',
    date: '3 days ago',
    note: 'Very important for UPSC Prelims. Refer to NCERT Class 12 Macroeconomics.',
  },
  {
    id: '4',
    question: 'What is the standard meridian of India?',
    subject: 'Geography',
    difficulty: 'Easy',
    type: 'saved',
    date: '4 days ago',
  },
  {
    id: '5',
    question: 'Calculate the compound interest for...',
    subject: 'Quant',
    difficulty: 'Hard',
    type: 'wrong',
    date: '1 week ago',
  },
];

const SummaryCard = ({ title, count, icon, colors, gradient, onPress, isActive }: any) => {
  const { isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.summaryCardWrapper,
        isActive && styles.summaryCardActive
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.summaryCard, isActive && { opacity: 1 }]}
      >
        <View style={styles.summaryIconContainer}>
          <Ionicons name={icon} size={24} color="#FFF" />
        </View>
        <View>
          <Text style={styles.summaryCount}>{count}</Text>
          <Text style={styles.summaryTitle}>{title}</Text>
        </View>
      </LinearGradient>
      {isActive && (
        <Animated.View
          entering={FadeInDown}
          style={[styles.activeIndicator, { backgroundColor: gradient[0] }]}
        />
      )}
    </TouchableOpacity>
  );
};

export default function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return MOCK_DATA.filter(item => {
      const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
      const matchesType = !selectedType || item.type === selectedType;
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubject && matchesType && matchesSearch;
    });
  }, [selectedSubject, selectedType, searchQuery]);

  const stats = useMemo(() => ({
    saved: MOCK_DATA.filter(i => i.type === 'saved').length,
    wrong: MOCK_DATA.filter(i => i.type === 'wrong').length,
    learn: MOCK_DATA.filter(i => i.type === 'learn').length,
  }), []);

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'Polity': return '#007AFF';
      case 'History': return '#FF9500';
      case 'Economy': return '#34C759';
      case 'Geography': return '#AF52DE';
      case 'Quant': return '#FF3B30';
      default: return colors.primary;
    }
  };

  const renderItem = ({ item, index }: { item: KnowledgeItem, index: number }) => (
    <Animated.View
      key={item.id}
      entering={FadeInDown.delay(index * 100)}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          // Placeholder for navigation or expansion
          console.log('Pressed item:', item.id);
        }}
      >
        <Card style={[styles.itemCard, { borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <View style={[styles.subjectTag, { backgroundColor: getSubjectColor(item.subject) + '15' }]}>
              <Text style={[styles.subjectTagText, { color: getSubjectColor(item.subject) }]}>{item.subject}</Text>
            </View>
            <Text style={[styles.itemDate, { color: colors.textTertiary }]}>{item.date}</Text>
          </View>

          <Text style={[styles.itemQuestion, { color: colors.text }]} numberOfLines={3}>
            {item.question}
          </Text>

          {item.note && (
            <View style={[styles.noteContainer, { backgroundColor: colors.secondaryBackground }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.note}
              </Text>
            </View>
          )}

          <View style={styles.itemFooter}>
            <View style={styles.typeTag}>
              <Ionicons
                name={item.type === 'saved' ? 'bookmark' : item.type === 'wrong' ? 'close-circle' : 'bulb'}
                size={14}
                color={item.type === 'saved' ? colors.primary : item.type === 'wrong' ? colors.error : colors.warning}
              />
              <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
            <TouchableOpacity style={styles.arrowButton}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.secondaryBackground }]}>
          <Ionicons name="filter" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <SummaryCard
            title="Saved"
            count={stats.saved}
            icon="bookmark"
            gradient={['#007AFF', '#00C6FF']}
            onPress={() => setSelectedType(selectedType === 'saved' ? null : 'saved')}
            isActive={selectedType === 'saved'}
          />
          <SummaryCard
            title="Incorrect"
            count={stats.wrong}
            icon="close-circle"
            gradient={['#FF3B30', '#FF9500']}
            onPress={() => setSelectedType(selectedType === 'wrong' ? null : 'wrong')}
            isActive={selectedType === 'wrong'}
          />
          <SummaryCard
            title="Revision"
            count={stats.learn}
            icon="bulb"
            gradient={['#34C759', '#30D158']}
            onPress={() => setSelectedType(selectedType === 'learn' ? null : 'learn')}
            isActive={selectedType === 'learn'}
          />
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <Input
            placeholder="Search saved items..."
            leftIcon="search"
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Categories */}
        <View style={styles.categoryWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectList}>
            {SUBJECTS.map(subject => (
              <TouchableOpacity
                key={subject}
                onPress={() => setSelectedSubject(subject)}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: selectedSubject === subject ? colors.primary : colors.secondaryBackground,
                    borderColor: selectedSubject === subject ? colors.primary : colors.border
                  }
                ]}
              >
                <Text style={[
                  styles.subjectChipText,
                  { color: selectedSubject === subject ? '#FFF' : colors.textSecondary }
                ]}>
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content List */}
        <View style={styles.listSection}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => renderItem({ item, index }))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No items found matching your search</Text>
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.largeTitle,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCardWrapper: {
    flex: 1,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    height: 110,
    justifyContent: 'space-between',
    opacity: 0.8,
  },
  summaryCardActive: {
    transform: [{ scale: 1.05 }],
  },
  activeIndicator: {
    height: 4,
    width: '40%',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    marginBottom: 0,
  },
  categoryWrap: {
    marginBottom: spacing.lg,
  },
  subjectList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  subjectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  subjectChipText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  listSection: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  itemCard: {
    padding: spacing.md,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  subjectTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemDate: {
    ...typography.caption2,
  },
  itemQuestion: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  noteContainer: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: borderRadius.sm,
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  noteText: {
    ...typography.caption1,
    flex: 1,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    ...typography.caption1,
    fontWeight: '500',
  },
  arrowButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  emptyText: {
    ...typography.subhead,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
