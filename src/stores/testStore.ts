import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, TestAttempt, LibraryItem } from '../types';

interface TestState {
  currentTestId: string | null;
  currentTestTitle: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>; // questionId -> optionIndex
  markedForReview: Record<string, boolean>;
  timeRemaining: number;
  totalTime: number;
  endTime: number | null; // Added for robust timer
  isPlaying: boolean;
  sessionStartTime: number | null;
  history: TestAttempt[];
  library: LibraryItem[];

  // Actions
  startTest: (testId: string, title: string, questions: Question[], duration: number) => void;
  submitAnswer: (questionId: string, answerIndex: number | null) => void;
  toggleMark: (questionId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpToQuestion: (index: number) => void;
  tickTimer: () => void;
  toggleTimer: () => void;
  finishTest: () => TestAttempt;
  addToLibrary: (item: Omit<LibraryItem, 'id' | 'saveTimestamp'>) => void;
  removeFromLibrary: (questionId: string, type?: LibraryItem['type']) => void;
  isQuestionInLibrary: (questionId: string, type?: LibraryItem['type']) => boolean;
  reset: () => void;
}

// Helper to calculate score
const calculateScore = (questions: Question[], answers: Record<string, number>) => {
  let score = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.correctAnswer) {
      score += 2; // +2 for correct
    } else if (answers[q.id] !== undefined && answers[q.id] !== null) {
      score -= 0.66; // -0.66 for UPSC (Standard 1/3rd penalty approximation)
    }
  });
  // Use Math.round to avoid floating point drift before toFixed
  const finalScore = Number((Math.round(score * 100) / 100).toFixed(2));
  return Math.max(0, finalScore);
};

export const useTestStore = create<TestState>()(
  persist(
    (set, get) => ({
      currentTestId: null,
      currentTestTitle: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      markedForReview: {},
      timeRemaining: 0,
      totalTime: 0,
      endTime: null,
      sessionStartTime: null,
      isPlaying: false,
      history: [],
      library: [],

      startTest: (testId, title, questions, duration) => {
        const now = Date.now();
        const durationMs = duration * 60 * 1000;
        set({
          currentTestId: testId,
          currentTestTitle: title,
          questions,
          timeRemaining: duration * 60,
          totalTime: duration * 60,
          endTime: now + durationMs,
          sessionStartTime: now,
          currentIndex: 0,
          answers: {},
          markedForReview: {},
          isPlaying: true,
        });
      },

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
        if (!state.isPlaying || !state.endTime) return {};

        const now = Date.now();
        const secondsRemaining = Math.max(0, Math.floor((state.endTime - now) / 1000));

        return { timeRemaining: secondsRemaining };
      }),

      toggleTimer: () => set((state) => {
        const isNowPlaying = !state.isPlaying;
        if (isNowPlaying) {
          // Resuming: recalculate endTime based on current timeRemaining
          return {
            isPlaying: true,
            endTime: Date.now() + state.timeRemaining * 1000
          };
        } else {
          // Pausing
          return { isPlaying: false };
        }
      }),

      finishTest: () => {
        const state = get();
        const score = calculateScore(state.questions, state.answers);

        // Auto-add wrong answers to Library
        const newLibraryItems: LibraryItem[] = [];
        state.questions.forEach(q => {
          const userAnswer = state.answers[q.id];
          if (userAnswer !== undefined && userAnswer !== q.correctAnswer) {
            // Check if already in library
            const alreadyExists = state.library.some(item => item.questionId === q.id && item.type === 'wrong');
            if (!alreadyExists) {
              newLibraryItems.push({
                id: Math.random().toString(36).substr(2, 9),
                questionId: q.id,
                question: q.text,
                subject: q.subject,
                difficulty: q.difficulty,
                type: 'wrong',
                saveTimestamp: Date.now(),
                // exam: state.currentTestId // Ideally pass exam name
              });
            }
          }
        });

        const attempt: TestAttempt = {
          id: Math.random().toString(36).substr(2, 9),
          testId: state.currentTestId!,
          testTitle: state.currentTestTitle || 'Unknown Test',
          userId: 'current-user', // Should come from auth store ideally
          startTime: state.sessionStartTime || Date.now(),
          endTime: Date.now(),
          score,
          totalMarks: state.questions.length * 2,
          answers: state.answers,
          markedForReview: { ...state.markedForReview },
          timeSpent: {}, // Placeholder
          status: 'Completed'
        };

        set((state) => ({
          history: [attempt, ...state.history],
          library: [...newLibraryItems, ...state.library],
          currentTestId: null,
          currentTestTitle: null,
          isPlaying: false,
          answers: {},
          markedForReview: {}
        }));

        return attempt;
      },

      addToLibrary: (item) => set((state) => {
        // Prevent duplicates for same question and type
        if (state.library.some(i => i.questionId === item.questionId && i.type === item.type)) {
          return {};
        }
        const newItem: LibraryItem = {
          ...item,
          id: Math.random().toString(36).substr(2, 9),
          saveTimestamp: Date.now(),
        };
        return { library: [newItem, ...state.library] };
      }),

      removeFromLibrary: (questionId, type) => set((state) => ({
        library: state.library.filter(i => {
          if (type) {
            return !(i.questionId === questionId && i.type === type);
          }
          return i.questionId !== questionId;
        })
      })),

      isQuestionInLibrary: (questionId, type) => {
        return get().library.some(i => {
          if (type) {
            return i.questionId === questionId && i.type === type;
          }
          return i.questionId === questionId;
        });
      },

      reset: () => set({
        currentTestId: null,
        currentTestTitle: null,
        questions: [],
        currentIndex: 0,
        answers: {},
        markedForReview: {},
        timeRemaining: 0,
        totalTime: 0,
        endTime: null,
        isPlaying: false,
        history: [],
        library: [],
      }),
    }),
    {
      name: 'test-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        history: state.history,
        library: state.library,
      }),
    }
  )
);
