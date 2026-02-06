import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, TestAttempt } from '../types';

interface TestState {
  currentTestId: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>; // questionId -> optionIndex
  markedForReview: Record<string, boolean>;
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  history: TestAttempt[];

  // Actions
  startTest: (testId: string, questions: Question[], duration: number) => void;
  submitAnswer: (questionId: string, answerIndex: number | null) => void;
  toggleMark: (questionId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpToQuestion: (index: number) => void;
  tickTimer: () => void;
  toggleTimer: () => void;
  finishTest: () => TestAttempt;
}

// Helper to calculate score
const calculateScore = (questions: Question[], answers: Record<string, number>) => {
  let score = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.correctAnswer) {
      score += 2; // +2 for correct
    } else if (answers[q.id] !== undefined && answers[q.id] !== null) {
      score -= 0.66; // -0.66 for wrong
    }
  });
  return Number(score.toFixed(2));
};

export const useTestStore = create<TestState>()(
  persist(
    (set, get) => ({
      currentTestId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      markedForReview: {},
      timeRemaining: 0,
      totalTime: 0,
      isPlaying: false,
      history: [],

      startTest: (testId, questions, duration) => set({
        currentTestId: testId,
        questions,
        timeRemaining: duration * 60, // Convert mins to seconds
        totalTime: duration * 60,
        currentIndex: 0,
        answers: {},
        markedForReview: {},
        isPlaying: true,
      }),

      submitAnswer: (questionId, answerIndex) => set((state) => {
        const newAnswers = { ...state.answers };
        if (answerIndex === null) {
          delete newAnswers[questionId];
        } else {
          newAnswers[questionId] = answerIndex;
        }
        return { answers: newAnswers };
      }),

      toggleMark: (questionId) => set((state) => ({
        markedForReview: {
          ...state.markedForReview,
          [questionId]: !state.markedForReview[questionId]
        }
      })),

      nextQuestion: () => set((state) => ({
        currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1)
      })),

      prevQuestion: () => set((state) => ({
        currentIndex: Math.max(state.currentIndex - 1, 0)
      })),

      jumpToQuestion: (index) => set({ currentIndex: index }),

      tickTimer: () => set((state) => {
        if (!state.isPlaying || state.timeRemaining <= 0) return {};
        return { timeRemaining: state.timeRemaining - 1 };
      }),

      toggleTimer: () => set((state) => ({ isPlaying: !state.isPlaying })),

      finishTest: () => {
        const state = get();
        const score = calculateScore(state.questions, state.answers);

        const attempt: TestAttempt = {
          id: Math.random().toString(36).substr(2, 9),
          testId: state.currentTestId!,
          userId: 'current-user', // Should come from auth store ideally
          startTime: Date.now() - ((state.totalTime - state.timeRemaining) * 1000),
          endTime: Date.now(),
          score,
          totalMarks: state.questions.length * 2,
          answers: state.answers,
          timeSpent: {}, // Placeholder
          status: 'Completed'
        };

        set((state) => ({
          history: [attempt, ...state.history],
          currentTestId: null,
          isPlaying: false,
          answers: {},
          markedForReview: {}
        }));

        return attempt;
      }
    }),
    {
      name: 'test-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ history: state.history }), // Only persist history
    }
  )
);
