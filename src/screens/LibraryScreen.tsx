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
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography, colors as themeColors } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { ExpandableText } from '../components/common/ExpandableText';
import { EmptyState } from '../components/common/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

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
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
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
      learn: { bg: colors.warning + '20', color: colors.warning, icon: 'bulb' as const },
    };
    const status = statusConfig[item.type as keyof typeof statusConfig] || statusConfig.saved;

    return (
      <View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <EmptyState
        title={message}
        description={subtext}
        icon={iconName as any}
        actionLabel={searchQuery ? "Clear Search" : undefined}
        onAction={searchQuery ? () => setSearchQuery('') : undefined}
      />
    );
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { paddingTop: spacing.md }]}>
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
                gradient={[colors.primary, '#00C6FF']}
                onPress={() => setSelectedType(selectedType === 'saved' ? null : 'saved')}
                isActive={selectedType === 'saved'}
              />
              <SummaryCard
                title="Incorrect"
                count={stats.wrong}
                icon="close-circle"
                gradient={[colors.error, colors.warning]}
                onPress={() => setSelectedType(selectedType === 'wrong' ? null : 'wrong')}
                isActive={selectedType === 'wrong'}
              />
              <SummaryCard
                title="Revision"
                count={stats.learn}
                icon="bulb"
                gradient={[colors.success, '#30D158']}
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
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedSubject(subject);
                    }}
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
            <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
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
                      Haptics.selectionAsync();
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
                  <View style={[styles.explanationBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.warning + '10' }]}>
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
    </ScreenWrapper>
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
    opacity: 1,
    transform: [{ scale: 1.02 }],
  },
  activeIndicator: {
    height: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginTop: -4,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    ...typography.title2,
    color: '#FFF',
    fontWeight: '800',
  },
  summaryTitle: {
    ...typography.caption1,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: 'transparent',
  },
  categoryWrap: {
    marginBottom: spacing.sm,
  },
  subjectList: {
    paddingHorizontal: spacing.base,
    gap: 8,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    ...typography.title3,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
  },
  modalScroll: {
    padding: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
  },
  itemCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: 12,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
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
    borderRadius: 20,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.title3,
    marginBottom: 4,
    fontWeight: '600',
  },
  // Question Detail Modal
  questionModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  questionModalContent: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  questionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  questionModalTitle: {
    ...typography.headline,
    fontWeight: '700',
  },
  questionModalBody: {
    flex: 1,
    padding: spacing.lg,
  },
  questionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  questionFullText: {
    ...typography.title3,
    fontWeight: '600',
    marginBottom: spacing.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: spacing.xl,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: 12,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  explanationBox: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  explanationContent: {
    fontSize: 14,
    lineHeight: 22,
  },
});
