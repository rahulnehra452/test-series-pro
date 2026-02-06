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
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography, colors as themeColors } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { getSubjectDetails } from '../utils/subjectIcons';

// Types
interface KnowledgeItem {
  id: string;
  question: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'saved' | 'wrong' | 'learn';
  date: string;
  note?: string;
  exam?: string;
}

// Mock Data
const SUBJECTS = ['All', 'Polity', 'History', 'Economy', 'Geography', 'Quant', 'Current Affairs'];
const EXAMS = ['All Exams', 'UPSC Prelims 2025', 'CSAT 2025', 'History Daily Quiz', 'Mains 2024'];

const MOCK_DATA: KnowledgeItem[] = [
  {
    id: '1',
    question: 'Which article of the constitution deals with fundamental rights?',
    subject: 'Polity',
    difficulty: 'Medium',
    type: 'saved',
    date: '2 hours ago',
    exam: 'UPSC Prelims 2025',
  },
  {
    id: '2',
    question: 'The Harappan civilization was first discovered in...',
    subject: 'History',
    difficulty: 'Easy',
    type: 'wrong',
    date: '1 day ago',
    exam: 'History Daily Quiz',
  },
  {
    id: '3',
    question: 'Concept of Repo Rate and its impact on inflation.',
    subject: 'Economy',
    difficulty: 'Hard',
    type: 'learn',
    date: '3 days ago',
    note: 'Very important for UPSC Prelims. Refer to NCERT Class 12 Macroeconomics.',
    exam: 'UPSC Prelims 2025',
  },
  {
    id: '4',
    question: 'What is the standard meridian of India?',
    subject: 'Geography',
    difficulty: 'Easy',
    type: 'saved',
    date: '4 days ago',
    exam: 'Mains 2024',
  },
  {
    id: '5',
    question: 'Calculate the compound interest for...',
    subject: 'Quant',
    difficulty: 'Hard',
    type: 'wrong',
    date: '1 week ago',
    exam: 'CSAT 2025',
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
  const [selectedExam, setSelectedExam] = useState('All Exams');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return MOCK_DATA.filter(item => {
      const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
      const matchesExam = selectedExam === 'All Exams' || item.exam === selectedExam;
      const matchesType = !selectedType || item.type === selectedType;
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.exam && item.exam.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSubject && matchesType && matchesSearch && matchesExam;
    });
  }, [selectedSubject, selectedType, searchQuery, selectedExam]);

  const stats = useMemo(() => ({
    saved: MOCK_DATA.filter(i => i.type === 'saved').length,
    wrong: MOCK_DATA.filter(i => i.type === 'wrong').length,
    learn: MOCK_DATA.filter(i => i.type === 'learn').length,
  }), []);

  // Helper function removed in favor of getSubjectDetails utility

  const renderItem = ({ item, index }: { item: KnowledgeItem, index: number }) => {
    const subjectDetails = getSubjectDetails(item.subject);

    return (
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
              <View style={[styles.subjectTag, { backgroundColor: subjectDetails.color + '15' }]}>
                <Ionicons name={subjectDetails.icon} size={12} color={subjectDetails.color} style={{ marginRight: 4 }} />
                <Text style={[styles.subjectTagText, { color: subjectDetails.color }]}>{item.subject}</Text>
              </View>
              {item.exam && (
                <View style={[styles.examTag, { backgroundColor: colors.secondaryBackground }]}>
                  <Text style={[styles.examTagText, { color: colors.textSecondary }]}>{item.exam}</Text>
                </View>
              )}
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
  };

  const renderEmptyState = () => {
    let iconName = 'library-outline';
    let message = 'Your library is empty';
    let subtext = 'Start taking tests to build your knowledge base';

    if (searchQuery) {
      iconName = 'search-outline';
      message = `No results for "${searchQuery}"`;
      subtext = 'Try a different search term';
    } else if (selectedExam !== 'All Exams') {
      iconName = 'filter-outline';
      message = `No items in ${selectedExam}`;
      subtext = 'Try selecting a different exam filter';
    } else if (selectedSubject !== 'All') {
      iconName = 'albums-outline';
      message = `No items in ${selectedSubject}`;
      subtext = 'Try a different subject';
    } else if (selectedType === 'saved') {
      iconName = 'bookmark-outline';
      message = 'No Saved Questions';
      subtext = 'Bookmark questions during tests to review them here';
    } else if (selectedType === 'wrong') {
      iconName = 'close-circle-outline';
      message = 'No Incorrect Answers';
      subtext = 'Great job! You haven\'t missed any questions yet';
    } else if (selectedType === 'learn') {
      iconName = 'bulb-outline';
      message = 'Nothing to Revise';
      subtext = 'Mark questions for revision to see them here';
    }

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconBg, { backgroundColor: colors.secondaryBackground }]}>
          <Ionicons name={iconName as any} size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>{message}</Text>
        <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{subtext}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: selectedExam !== 'All Exams' ? colors.primary + '20' : colors.secondaryBackground }
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons
            name={selectedExam !== 'All Exams' ? "filter" : "filter-outline"}
            size={20}
            color={selectedExam !== 'All Exams' ? colors.primary : colors.textSecondary}
          />
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

        <View style={styles.categoryWrap}>
          {/* Subject Chips Only - Exam Chips Moved to Modal */}
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
            renderEmptyState()
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Exam</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.closeButton, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                {EXAMS.map((exam) => (
                  <TouchableOpacity
                    key={exam}
                    style={[
                      styles.modalOption,
                      { backgroundColor: exam === selectedExam ? colors.primary + '15' : 'transparent' }
                    ]}
                    onPress={() => {
                      setSelectedExam(exam);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      {
                        color: exam === selectedExam ? colors.primary : colors.text,
                        fontWeight: exam === selectedExam ? '700' : '500'
                      }
                    ]}>
                      {exam}
                    </Text>
                    {exam === selectedExam && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
  subjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.caption1,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 250,
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
  examChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  examChipText: {
    fontSize: 12,
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

  subjectTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  examTag: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  examTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemDate: {
    ...typography.caption2,
    marginLeft: 'auto',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  modalOptionText: {
    fontSize: 16,
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
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.subhead,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
