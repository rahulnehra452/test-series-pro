import React, { useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTestStore } from '../stores/testStore';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { safeHaptics as Haptics } from '../utils/haptics';
import { useToastStore } from '../stores/toastStore';

// Components
import { TestHeader } from '../components/test/TestHeader';
import { QuestionDisplay } from '../components/test/QuestionDisplay';
import { OptionButton } from '../components/test/OptionButton';
import { ActionBar } from '../components/test/ActionBar';
import { QuestionPalette } from '../components/test/QuestionPalette';

// ... imports
import { getQuestionsForTest } from '../data/mockQuestions';

export default function TestInterfaceScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { testId, testTitle } = (route.params as { testId: string; testTitle?: string }) || {};

  const { showToast } = useToastStore();
  const {
    startTest,
    currentTestId,
    currentIndex,
    questions,
    timeRemaining,
    answers,
    markedForReview,
    submitAnswer,
    toggleMark,
    nextQuestion,
    prevQuestion,
    tickTimer,
    toggleTimer,
    finishTest,
    addToLibrary,
    removeFromLibrary,
    isQuestionInLibrary,
  } = useTestStore();

  useEffect(() => {
    if (testId) {
      // Only start a new test if we aren't already in this test session
      if (currentTestId !== testId) {
        const newQuestions = getQuestionsForTest(testId);
        startTest(testId, testTitle || 'Practice Test', newQuestions, 120); // 120 mins default
      }
    } else {
      // Fallback or error if no testId
      Alert.alert("Error", "No Test ID provided");
      navigation.goBack();
    }
  }, [testId]);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      const { timeRemaining, isPlaying, finishTest: finish } = useTestStore.getState();

      if (isPlaying) {
        tickTimer();

        // Auto-submit if time is up
        if (timeRemaining <= 0) {
          clearInterval(timer);
          const result = finish();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast('Time is up! Test submitted.', 'info');
          (navigation as any).replace('Results', { result });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [tickTimer, navigation, showToast]);

  const currentQuestion = questions[currentIndex];

  // Show a loading or empty state if initializing
  if (!currentQuestion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedOption = answers[currentQuestion.id] ?? null;
  const isMarked = markedForReview[currentQuestion.id] ?? false;
  // Check if current question is already in library (Saved)
  const isBookmarked = isQuestionInLibrary(currentQuestion.id, 'saved');
  const isLearn = isQuestionInLibrary(currentQuestion.id, 'learn');

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;

  const handleOptionSelect = (idx: number) => {
    Haptics.selectionAsync();
    submitAnswer(currentQuestion.id, idx);
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    submitAnswer(currentQuestion.id, null);
  };

  const handleToggleMark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleMark(currentQuestion.id);
    if (!isMarked) {
      showToast('Marked for review', 'info');
    }
  };

  const handleBookmark = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isBookmarked) {
      removeFromLibrary(currentQuestion.id, 'saved');
      showToast('Removed from Saved Questions', 'info');
    } else {
      addToLibrary({
        questionId: currentQuestion.id,
        question: currentQuestion.text,
        subject: currentQuestion.subject,
        difficulty: currentQuestion.difficulty,
        type: 'saved',
        exam: testId // Storing Test ID as Exam for now
      });
      showToast('Saved to Library', 'success');
    }
  };

  const handleLearn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isLearn) {
      removeFromLibrary(currentQuestion.id, 'learn');
      showToast('Removed from Revision', 'info');
    } else {
      addToLibrary({
        questionId: currentQuestion.id,
        question: currentQuestion.text,
        subject: currentQuestion.subject,
        difficulty: currentQuestion.difficulty,
        type: 'learn',
        exam: testId // Storing Test ID as Exam for now
      });
      showToast('Marked for Revision', 'success');
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextQuestion();
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    prevQuestion();
  };

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Submit Test",
      "Are you sure you want to finish the test?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "destructive",
          onPress: () => {
            const result = finishTest();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Test submitted successfully!', 'success');
            (navigation as any).replace('Results', { result });
          }
        }
      ]
    );
  };

  const handlePause = () => {
    toggleTimer();
    Alert.alert(
      "Paused",
      "Test is paused. Click Resume to continue.",
      [{ text: "Resume", onPress: () => toggleTimer() }]
    );
  };

  const [isPaletteVisible, setPaletteVisible] = React.useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TestHeader
        timeRemaining={timeRemaining}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onPause={handlePause}
        onOpenPalette={() => setPaletteVisible(true)}
        onBookmark={handleBookmark}
        isBookmarked={isBookmarked}
        onLearn={handleLearn}
        isLearn={isLearn}
      />

      <View style={styles.mainContent}>
        <QuestionDisplay
          question={currentQuestion}
          questionNumber={currentIndex + 1}
        />

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((opt, idx) => (
            <OptionButton
              key={idx}
              label={String.fromCharCode(65 + idx)} // A, B, C, D
              text={opt}
              isSelected={selectedOption === idx}
              onPress={() => handleOptionSelect(idx)}
            />
          ))}
        </View>
      </View>

      <ActionBar
        onClear={handleClear}
        onMarkForReview={handleToggleMark}
        isMarked={isMarked}
        onNext={handleNext}
        onPrev={handlePrev}
        onSubmit={handleSubmit}
        isFirst={isFirst}
        isLast={isLast}
        showSubmit={isLast}
      />

      <QuestionPalette
        isVisible={isPaletteVisible}
        onClose={() => setPaletteVisible(false)}
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
        marked={markedForReview}
        onJumpToQuestion={useTestStore.getState().jumpToQuestion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
