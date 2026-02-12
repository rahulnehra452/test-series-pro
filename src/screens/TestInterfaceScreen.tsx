import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Alert, ActivityIndicator, AppState } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTestStore } from '../stores/testStore';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { safeHaptics as Haptics } from '../utils/haptics';
import { useToastStore } from '../stores/toastStore';
import { StackActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

import { audio } from '../utils/audio';

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
  const navigation = useNavigation<NavigationProp>();
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
    saveProgress,
    hasSeenSwipeHint,
    markSwipeHintSeen,
  } = useTestStore();

  const [isPaletteVisible, setPaletteVisible] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initTest() {
      if (!testId) {
        Alert.alert("Error", "No Test ID provided");
        navigation.goBack();
        return;
      }

      // 1. Initialize audio
      audio.loadSounds();

      // 2. Only start a new test if we aren't already in this test session
      if (currentTestId !== testId) {
        setLoading(true);
        try {
          // Find test metadata for duration
          const testMeta = useTestStore.getState().tests.find(t => t.id === testId);
          const duration = testMeta?.duration || 120; // Default to 120 if missing

          // Fetch real questions from Supabase
          const fetchedQuestions = await useTestStore.getState().fetchQuestions(testId);

          if (fetchedQuestions.length === 0) {
            // Fallback to mock if database is empty for now (Launch transitional)
            // But we should probably alert for PRODUCTION
            const mockQuestions = getQuestionsForTest(testId);
            if (mockQuestions.length === 0) {
              Alert.alert("Notice", "This test doesn't have any questions yet.");
              navigation.goBack();
              return;
            }
            startTest(testId, testTitle || 'TestKra. Practice', mockQuestions, duration);
          } else {
            startTest(testId, testTitle || 'TestKra. Practice', fetchedQuestions, duration);
          }
        } catch (e) {
          console.error('Failed to initialize test:', e);
          Alert.alert("Error", "Could not load test questions.");
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      }
    }

    initTest();
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

  // Handle Back Navigation - Prevent accidental exit
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const { isPlaying, toggleTimer, saveProgress } = useTestStore.getState();

      // If test is not playing (e.g. already paused or finished), allow exit
      // Note: We might want to confirm even if paused, but let's assume paused means safe state
      if (!isPlaying) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Pause the test immediately
      toggleTimer();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      Alert.alert(
        'Exit Test?',
        'Your progress will be saved. You can resume this test later from the home screen.',
        [
          {
            text: "Don't Leave",
            style: 'cancel',
            onPress: () => {
              // Resume timer if they stay
              toggleTimer();
            }
          },
          {
            text: 'Save & Exit',
            style: 'default',
            onPress: () => {
              // Navigate back
              saveProgress();
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation]);

  // Handle AppState Change - Instant Timer Sync
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        const { isPlaying } = useTestStore.getState();
        if (isPlaying) {
          tickTimer(); // Sync immediately on foreground
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [tickTimer]);

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

    // Play sound based on correctness
    if (idx === currentQuestion.correctAnswer) {
      audio.playSuccess();
    } else {
      audio.playFailure();
    }

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
    setDirection('next');
    nextQuestion();
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirection('prev');
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
            navigation.replace('Results', { result });
          }
        }
      ]
    );
  };

  const handlePause = () => {
    toggleTimer(); // Pause the test
    Alert.alert(
      "Test Paused",
      "Choose an action:",
      [
        { text: "Resume", onPress: () => toggleTimer() },
        {
          text: "Save & Exit",
          onPress: () => {
            saveProgress();
            navigation.goBack();
          }
        },
        {
          text: "Submit Test",
          style: 'destructive',
          onPress: () => {
            // Confirm submission
            Alert.alert(
              "Submit Test",
              "Are you sure you want to finish now?",
              [
                { text: "Cancel", style: "cancel", onPress: () => toggleTimer() }, // Resume if canceled
                {
                  text: "Submit",
                  style: 'destructive',
                  onPress: () => {
                    const result = finishTest();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showToast('Test submitted successfully!', 'success');
                    navigation.dispatch(StackActions.replace('Results', { result }));
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };






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

      <View style={{ flex: 1 }}>
        <View
          key={currentIndex}
          style={[{ flex: 1 }]}
        >
          <View style={styles.mainContent}>
            <QuestionDisplay
              question={currentQuestion}
              questionNumber={currentIndex + 1}
            />

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((opt, idx) => (
                <OptionButton
                  key={idx}
                  label={String.fromCharCode(65 + idx)}
                  text={opt}
                  isSelected={selectedOption === idx}
                  onPress={() => handleOptionSelect(idx)}
                />
              ))}
            </View>
          </View>
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
    </SafeAreaView >
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
