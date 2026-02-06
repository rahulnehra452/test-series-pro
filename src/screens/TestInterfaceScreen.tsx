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
  const route = useRoute(); // Need to import useRoute or get it from props
  const { testId } = (route.params as { testId: string }) || {};

  const { showToast } = useToastStore();
  const {
    startTest,
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
    finishTest
  } = useTestStore();

  useEffect(() => {
    if (testId) {
      // If we are opening a new test, initialize it
      // Note: In a real app, you might check if `currentTestId` matches `testId` to resume
      // For now, we perform a fresh start for simplicity or if questions are missing
      const newQuestions = getQuestionsForTest(testId);
      startTest(testId, newQuestions, 120); // 120 mins default
    } else {
      // Fallback or error if no testId
      Alert.alert("Error", "No Test ID provided");
      navigation.goBack();
    }
  }, [testId]);

  const currentQuestion = questions[currentIndex];

  // Show a loading or empty state if initializing
  if (!currentQuestion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  // ... rest of the component

  const selectedOption = answers[currentQuestion.id] ?? null;
  const isMarked = markedForReview[currentQuestion.id] ?? false;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickTimer]);

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
            (navigation as any).navigate('Main', { screen: 'Results', params: { result } });
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
