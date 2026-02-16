import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography, colors as themeColors } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { ExpandableText } from '../components/common/ExpandableText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getSubjectDetails } from '../utils/subjectIcons';
import { LibraryItem, LibraryItemType } from '../types';

// Types

// Mock Data
import { useTestStore } from '../stores/testStore';
import { getQuestionById } from '../data/mockQuestions';
import { supabase } from '../lib/supabase';
import { runtimeConfig } from '../config/runtimeConfig';

// Mock Data - Removed in favor of store
// Mock Data - Removed in favor of store
const SUBJECTS = ['All', 'Polity', 'History', 'Economy', 'Geography', 'Quant', 'Current Affairs'];
// const EXAMS = ['All Exams', 'UPSC Prelims 2025', 'CSAT 2025', 'History Daily Quiz', 'Mains 2024'];
import { CATEGORIES, MOCK_TEST_SERIES } from './TestsScreen';
const EXAM_FILTERS = ['All Exams', ...CATEGORIES.filter(c => c !== 'All')];

const getExamCategory = (examStr: string | undefined): string => {
  if (!examStr) return 'Other';
  // If the exam string IS a category
  if (CATEGORIES.includes(examStr)) return examStr;

  // Try to find a test with this ID
  const test = MOCK_TEST_SERIES.find(t => t.id === examStr || t.title === examStr);
  if (test) return test.category;

  // Fallback heuristics
  const lower = examStr.toLowerCase();
  if (lower.includes('upsc')) return 'UPSC';
  if (lower.includes('ssc')) return 'SSC';
  if (lower.includes('banking') || lower.includes('sbi') || lower.includes('ibps')) return 'Banking';
  if (lower.includes('railway') || lower.includes('rrb') || lower.includes('ntpc')) return 'Railways';

  return 'Other';
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

type LibraryQuestionDetail = {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: number;
  explanation?: string;
  subject: string;
  difficulty: string;
  type: string;
};

interface SummaryCardProps {
  title: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string, ...string[]];
  onPress: () => void;
  isActive: boolean;
}

const SummaryCard = ({ title, count, icon, gradient, onPress, isActive }: SummaryCardProps) => {
  const { isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.summaryCardWrapper,
        isActive && styles.summaryCardActive
      ]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.summaryCard,
          isActive && { opacity: 1, transform: [{ scale: 1 }] },
          !isActive && { opacity: 0.7 }
        ]}
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
        <View
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
  const [selectedQuestion, setSelectedQuestion] = useState<LibraryQuestionDetail | null>(null);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [openingQuestionId, setOpeningQuestionId] = useState<string | null>(null);
  const [typeChangeModalVisible, setTypeChangeModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const { library, updateLibraryItemType } = useTestStore();

  const filteredItems = useMemo(() => {
    // First filter by criteria
    const filtered = library.filter(item => {
      const itemCategory = getExamCategory(item.exam);

      const matchesSubject = selectedSubject === 'All' || item.subject.toLowerCase() === selectedSubject.toLowerCase() || item.subject.toLowerCase().includes(selectedSubject.toLowerCase());
      const matchesExam = selectedExam === 'All Exams' || itemCategory === selectedExam;
      const matchesType = !selectedType || item.type.toLowerCase() === selectedType;
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.exam && item.exam.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSubject && matchesType && matchesSearch && matchesExam;
    });

    // De-duplicate by questionId (keep first occurrence / most recent)
    const seen = new Set<string>();
    return filtered.filter(item => {
      if (seen.has(item.questionId)) return false;
      seen.add(item.questionId);
      return true;
    });
  }, [selectedSubject, selectedType, searchQuery, selectedExam, library]);

  const stats = useMemo(() => {
    const relevantItems = selectedExam === 'All Exams'
      ? library
      : library.filter(i => getExamCategory(i.exam) === selectedExam);

    return {
      saved: relevantItems.filter(i => i.type === 'saved').length,
      wrong: relevantItems.filter(i => i.type === 'wrong').length,
      learn: relevantItems.filter(i => i.type === 'learn').length,
    };
  }, [library, selectedExam]);

  // Helper function removed in favor of getSubjectDetails utility

  // Helper: Format date nicely
  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const oneMin = 60 * 1000;
    const oneHour = 60 * oneMin;
    const oneDay = 24 * oneHour;

    if (diff < oneMin) return 'Just now';
    if (diff < oneHour) return `${Math.floor(diff / oneMin)}m ago`;
    if (diff < oneDay) {
      const today = new Date().toDateString();
      const itemDate = new Date(timestamp).toDateString();
      if (today === itemDate) return 'Today';
    }
    return new Date(timestamp).toLocaleDateString();
  };

  // Helper: Format type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'wrong': return 'Incorrect';
      case 'saved': return 'Saved';
      case 'learn': return 'Revision';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Handle changing item type
  const handleTypeChange = (itemId: string, currentType: LibraryItemType) => {
    // Simple toggle: Saved ↔ Revision (no Incorrect option)
    const options = currentType === 'saved'
      ? ['Mark for Revision', 'Remove from Library', 'Cancel']
      : ['Save to Library', 'Remove from Library', 'Cancel'];

    const destructiveButtonIndex = 1;
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: 'Change Type',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            // Toggle between saved and learn
            updateLibraryItemType(itemId, currentType === 'saved' ? 'learn' : 'saved');
          } else if (buttonIndex === 1) {
            // Remove from library - find the item to get questionId
            const item = library.find(i => i.id === itemId);
            if (item) {
              Alert.alert(
                'Remove from Library',
                'Are you sure you want to remove this question?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove', style: 'destructive', onPress: () => {
                      // Import and use removeFromLibrary
                      useTestStore.getState().removeFromLibrary(item.questionId, item.type);
                    }
                  },
                ]
              );
            }
          }
        }
      );
    } else {
      // Android - use Alert with buttons
      Alert.alert(
        'Change Type',
        '',
        [
          {
            text: currentType === 'saved' ? 'Mark for Revision' : 'Save to Library',
            onPress: () => updateLibraryItemType(itemId, currentType === 'saved' ? 'learn' : 'saved')
          },
          {
            text: 'Remove from Library',
            style: 'destructive',
            onPress: () => {
              const item = library.find(i => i.id === itemId);
              if (item) {
                useTestStore.getState().removeFromLibrary(item.questionId, item.type);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const toDetailFromLibraryItem = (item: LibraryItem): LibraryQuestionDetail => ({
    id: item.questionId,
    text: item.question,
    options: item.options || [],
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    subject: item.subject,
    difficulty: item.difficulty,
    type: item.questionType || 'MCQ',
  });

  const fetchCloudQuestionDetail = async (questionId: string): Promise<LibraryQuestionDetail | null> => {
    if (!isUuid(questionId)) return null;

    const { data, error } = await supabase
      .from('questions')
      .select('id,text,options,correct_answer,explanation,subject,difficulty,type')
      .eq('id', questionId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: String(data.id),
      text: data.text || 'Question',
      options: Array.isArray(data.options) ? data.options : [],
      correctAnswer: Number.isInteger(data.correct_answer) ? data.correct_answer : undefined,
      explanation: data.explanation || undefined,
      subject: data.subject || 'General',
      difficulty: data.difficulty || 'Medium',
      type: data.type || 'MCQ',
    };
  };

  const openQuestionDetail = async (item: LibraryItem) => {
    setOpeningQuestionId(item.id);
    try {
      let detail: LibraryQuestionDetail | null = null;

      if (item.options && item.options.length > 0) {
        detail = toDetailFromLibraryItem(item);
      }

      if (!detail) {
        detail = await fetchCloudQuestionDetail(item.questionId);
      }

      if (!detail && runtimeConfig.features.allowMockFallback) {
        const mockQuestion = getQuestionById(item.questionId);
        if (mockQuestion) {
          detail = {
            id: mockQuestion.id,
            text: mockQuestion.text,
            options: mockQuestion.options,
            correctAnswer: mockQuestion.correctAnswer,
            explanation: mockQuestion.explanation,
            subject: mockQuestion.subject,
            difficulty: mockQuestion.difficulty,
            type: mockQuestion.type,
          };
        }
      }

      if (!detail) {
        detail = toDetailFromLibraryItem(item);
      }

      setSelectedQuestion(detail);
      setQuestionModalVisible(true);
    } finally {
      setOpeningQuestionId(null);
    }
  };

  const renderItem = ({ item, index }: { item: LibraryItem, index: number }) => {
    const subjectDetails = getSubjectDetails(item.subject);

    // Status styling
    const statusConfig = {
      saved: { bg: colors.primary + '20', color: colors.primary, icon: 'bookmark' as const },
      wrong: { bg: colors.error + '20', color: colors.error, icon: 'close-circle' as const },
      learn: { bg: '#FF9500' + '20', color: '#FF9500', icon: 'bulb' as const },
    };
    const status = statusConfig[item.type as keyof typeof statusConfig] || statusConfig.saved;

    return (
      <View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            openQuestionDetail(item);
          }}
        >
          <Card style={styles.itemCard} padding={0}>
            <View style={styles.cardContent}>
              {/* Top Row: Subject + Date */}
              <View style={styles.cardTopRow}>
                <View style={[styles.subjectBadge, { backgroundColor: subjectDetails.color + '18' }]}>
                  <Ionicons name={subjectDetails.icon} size={14} color={subjectDetails.color} />
                  <Text style={[styles.subjectBadgeText, { color: subjectDetails.color }]}>
                    {item.subject.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
                  {formatDate(item.saveTimestamp)}
                </Text>
              </View>

              {/* Question */}
              <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={2}>
                {item.question}
              </Text>

              {/* Bottom Row: Status Badge + Arrow */}
              <View style={styles.cardBottomRow}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleTypeChange(item.id, item.type);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Ionicons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>
                      {getTypeLabel(item.type)}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={status.color} style={{ marginLeft: 2 }} />
                  </View>
                </TouchableOpacity>
                {openingQuestionId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                )}
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
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

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
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
                placeholder="Search questions..."
                leftIcon="search"
                value={searchQuery}
                onChangeText={setSearchQuery}
                containerStyle={styles.searchInput}
              />
            </View>

            <View style={styles.categoryWrap}>
              {/* Subject Chips Only - Exam Chips Moved to Modal */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectList}
              >
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
                {/* Extra padding at end for fade */}
                <View style={{ width: 40 }} />
              </ScrollView>
              {/* Fade gradient overlay */}
              <LinearGradient
                colors={[colors.background + '00', colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fadeGradient}
                pointerEvents="none"
              />
            </View>
          </>
        }
        ListEmptyComponent={renderEmptyState()}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

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
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Exam</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.closeButton, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                {EXAM_FILTERS.map((exam) => (
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

      {/* Question Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={questionModalVisible}
        onRequestClose={() => setQuestionModalVisible(false)}
      >
        <View style={[styles.questionModalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.questionModalContent, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.questionModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.questionModalTitle, { color: colors.text }]}>Question Details</Text>
              <TouchableOpacity onPress={() => setQuestionModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {selectedQuestion && (
              <ScrollView style={styles.questionModalBody} showsVerticalScrollIndicator={false}>
                {/* Subject & Difficulty */}
                <View style={styles.questionMetaRow}>
                  <View style={[styles.subjectBadge, { backgroundColor: getSubjectDetails(selectedQuestion.subject).color + '18' }]}>
                    <Ionicons name={getSubjectDetails(selectedQuestion.subject).icon} size={14} color={getSubjectDetails(selectedQuestion.subject).color} />
                    <Text style={[styles.subjectBadgeText, { color: getSubjectDetails(selectedQuestion.subject).color }]}>
                      {selectedQuestion.subject.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.difficultyBadge, {
                    backgroundColor: selectedQuestion.difficulty === 'Easy' ? colors.success + '20' :
                      selectedQuestion.difficulty === 'Hard' ? colors.error + '20' : colors.warning + '20'
                  }]}>
                    <Text style={[styles.difficultyText, {
                      color: selectedQuestion.difficulty === 'Easy' ? colors.success :
                        selectedQuestion.difficulty === 'Hard' ? colors.error : colors.warning
                    }]}>
                      {selectedQuestion.difficulty}
                    </Text>
                  </View>
                </View>

                {/* Question Text */}
                <Text style={[styles.questionFullText, { color: colors.text }]}>
                  {selectedQuestion.text}
                </Text>

                {/* Options */}
                <View style={styles.optionsContainer}>
                  {selectedQuestion.options.length > 0 ? (
                    selectedQuestion.options.map((option, idx) => {
                      const isCorrect =
                        selectedQuestion.correctAnswer !== undefined &&
                        idx === selectedQuestion.correctAnswer;
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.optionItem,
                            {
                              backgroundColor: isCorrect ? colors.success + '15' : colors.secondaryBackground,
                              borderColor: isCorrect ? colors.success : colors.border,
                            }
                          ]}
                        >
                          <View style={[styles.optionLetter, { backgroundColor: isCorrect ? colors.success : colors.textTertiary + '30' }]}>
                            <Text style={[styles.optionLetterText, { color: isCorrect ? '#FFF' : colors.text }]}>
                              {String.fromCharCode(65 + idx)}
                            </Text>
                          </View>
                          <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                          {isCorrect && (
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <View style={[styles.optionItem, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
                      <Text style={[styles.optionText, { color: colors.textSecondary }]}>
                        Full options are not available for this saved question yet.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Explanation */}
                {selectedQuestion.explanation && (
                  <View style={[styles.explanationBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF9E6' }]}>
                    <View style={styles.explanationHeader}>
                      <Ionicons name="bulb" size={18} color="#FF9500" />
                      <Text style={[styles.explanationTitle, { color: colors.text }]}>Explanation</Text>
                    </View>
                    <ExpandableText
                      text={selectedQuestion.explanation}
                      style={[styles.explanationContent, { color: colors.textSecondary }]}
                      maxLines={3}
                    />
                  </View>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
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
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
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
  fadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
  },
  // New card styles
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  cardContent: {
    padding: spacing.md,
    paddingLeft: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDate: {
    ...typography.caption2,
    fontWeight: '500',
  },
  questionText: {
    ...typography.body,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Question Detail Modal Styles
  questionModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  questionModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  questionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  questionModalTitle: {
    ...typography.headline,
    fontWeight: '600',
  },
  questionModalBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  questionFullText: {
    ...typography.body,
    fontWeight: '500',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    ...typography.subhead,
  },
  explanationBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  explanationTitle: {
    ...typography.subhead,
    fontWeight: '600',
  },
  explanationContent: {
    ...typography.body,
    lineHeight: 22,
  },
});
