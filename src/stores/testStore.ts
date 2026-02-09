import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, TestAttempt, LibraryItem, LibraryItemType } from '../types';

interface TestState {
  currentTestId: string | null;
  currentTestTitle: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>; // questionId -> optionIndex
  markedForReview: Record<string, boolean>;
  timeSpent: Record<string, number>; // questionId -> seconds spent
  questionVisitedAt: number | null; // timestamp when current question was visited
  timeRemaining: number;
  totalTime: number;
  endTime: number | null; // Added for robust timer
  isPlaying: boolean;
  sessionStartTime: number | null;
  history: TestAttempt[];
  library: LibraryItem[];
  hasSeenSwipeHint: boolean;
  markSwipeHintSeen: () => void;

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
  updateLibraryItemType: (itemId: string, newType: LibraryItemType) => void;
  removeFromLibrary: (questionId: string, type?: LibraryItemType) => void;
  isQuestionInLibrary: (questionId: string, type?: LibraryItemType) => boolean;
  reset: () => void;
  saveProgress: () => void;
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
      timeSpent: {},
      questionVisitedAt: null,
      timeRemaining: 0,
      totalTime: 0,
      endTime: null,
      sessionStartTime: null,
      isPlaying: false,
      history: [],
      library: [],
      hasSeenSwipeHint: false,
      markSwipeHintSeen: () => set({ hasSeenSwipeHint: true }),

      saveProgress: () => set((state) => {
        if (!state.currentTestId) return {};

        const now = Date.now();

        // Calculate pending time
        let finalTimeSpent = { ...state.timeSpent };
        const currentQ = state.questions[state.currentIndex];
        if (currentQ && state.questionVisitedAt) {
          // If playing, add elapsed time. If paused, questionVisitedAt is null so this skips.
          // Check isPlaying too? If questionVisitedAt is set, it implies we were tracking.
          const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
          finalTimeSpent[currentQ.id] = (finalTimeSpent[currentQ.id] || 0) + elapsed;
        }

        const currentAttempt: TestAttempt = {
          id: state.currentTestId + '-progress', // ID for in-progress attempt
          testId: state.currentTestId,
          testTitle: state.currentTestTitle || 'Unknown',
          userId: 'current-user',
          startTime: state.sessionStartTime || now,
          score: calculateScore(state.questions, state.answers),
          totalMarks: state.questions.length * 2,
          questions: state.questions,
          answers: state.answers,
          markedForReview: state.markedForReview,
          timeSpent: finalTimeSpent,
          status: 'In Progress',
          currentIndex: state.currentIndex,
          timeRemaining: state.timeRemaining,
        };

        // Remove existing in-progress for this test and add updated one
        const newHistory = state.history.filter(h =>
          !(h.testId === state.currentTestId && h.status === 'In Progress')
        );

        // Update history but keep current state (user might stay on screen)
        return {
          history: [...newHistory, currentAttempt]
        };
      }),

      startTest: (testId, title, questions, duration) => {
        // 1. Auto-save previous active test if switching
        const state = get();
        if (state.currentTestId && state.currentTestId !== testId) {
          state.saveProgress();
        }

        // 2. Check for resume
        const resumeAttempt = state.history.find(h =>
          h.testId === testId && h.status === 'In Progress'
        );

        if (resumeAttempt) {
          // RESUME
          set({
            currentTestId: testId,
            currentTestTitle: title || resumeAttempt.testTitle,
            questions: resumeAttempt.questions && resumeAttempt.questions.length > 0
              ? resumeAttempt.questions
              : questions, // Fallback if old attempt didn't store questions
            timeRemaining: resumeAttempt.timeRemaining || duration * 60,
            totalTime: duration * 60,
            endTime: Date.now() + (resumeAttempt.timeRemaining || duration * 60) * 1000,
            sessionStartTime: resumeAttempt.startTime,
            currentIndex: resumeAttempt.currentIndex || 0,
            answers: resumeAttempt.answers || {},
            markedForReview: resumeAttempt.markedForReview || {},
            timeSpent: resumeAttempt.timeSpent || {},
            questionVisitedAt: Date.now(), // Start tracking immediately
            isPlaying: true,
          });
          return;
        }

        // 3. Start Fresh
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
          timeSpent: {},
          questionVisitedAt: now, // Start tracking first question
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

      nextQuestion: () => set((state) => {
        const now = Date.now();
        const newIndex = Math.min(state.currentIndex + 1, state.questions.length - 1);
        const currentQ = state.questions[state.currentIndex];

        // Accumulate time on current question before moving
        let newTimeSpent = { ...state.timeSpent };
        if (currentQ && state.questionVisitedAt && state.isPlaying) {
          const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
          newTimeSpent[currentQ.id] = (newTimeSpent[currentQ.id] || 0) + elapsed;
        }

        return {
          currentIndex: newIndex,
          timeSpent: newTimeSpent,
          questionVisitedAt: now,
        };
      }),

      prevQuestion: () => set((state) => {
        const now = Date.now();
        const newIndex = Math.max(state.currentIndex - 1, 0);
        const currentQ = state.questions[state.currentIndex];

        let newTimeSpent = { ...state.timeSpent };
        if (currentQ && state.questionVisitedAt && state.isPlaying) {
          const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
          newTimeSpent[currentQ.id] = (newTimeSpent[currentQ.id] || 0) + elapsed;
        }

        return {
          currentIndex: newIndex,
          timeSpent: newTimeSpent,
          questionVisitedAt: now,
        };
      }),

      jumpToQuestion: (index) => set((state) => {
        const now = Date.now();
        const currentQ = state.questions[state.currentIndex];

        let newTimeSpent = { ...state.timeSpent };
        if (currentQ && state.questionVisitedAt && state.isPlaying) {
          const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
          newTimeSpent[currentQ.id] = (newTimeSpent[currentQ.id] || 0) + elapsed;
        }

        return {
          currentIndex: index,
          timeSpent: newTimeSpent,
          questionVisitedAt: now,
        };
      }),

      tickTimer: () => set((state) => {
        if (!state.isPlaying || !state.endTime) return {};

        const now = Date.now();
        const secondsRemaining = Math.max(0, Math.floor((state.endTime - now) / 1000));

        return { timeRemaining: secondsRemaining };
      }),

      toggleTimer: () => set((state) => {
        const isNowPlaying = !state.isPlaying;
        const now = Date.now();

        if (isNowPlaying) {
          // Resuming: recalculate endTime based on current timeRemaining
          return {
            isPlaying: true,
            endTime: Date.now() + state.timeRemaining * 1000,
            questionVisitedAt: now, // Start tracking from now
          };
        } else {
          // Pausing
          // Accumulate time spent so far before pausing
          let newTimeSpent = { ...state.timeSpent };
          const currentQ = state.questions[state.currentIndex];
          if (currentQ && state.questionVisitedAt) {
            const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
            newTimeSpent[currentQ.id] = (newTimeSpent[currentQ.id] || 0) + elapsed;
          }

          return {
            isPlaying: false,
            timeSpent: newTimeSpent,
            questionVisitedAt: null, // Stop tracking
          };
        }
      }),

      finishTest: () => {
        const state = get();
        const now = Date.now();
        const score = calculateScore(state.questions, state.answers);

        // Capture time spent on the last question
        let finalTimeSpent = { ...state.timeSpent };
        const currentQ = state.questions[state.currentIndex];
        if (currentQ && state.questionVisitedAt && state.isPlaying) {
          const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
          finalTimeSpent[currentQ.id] = (finalTimeSpent[currentQ.id] || 0) + elapsed;
        }

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
              });
            }
          }
        });

        const attempt: TestAttempt = {
          id: Math.random().toString(36).substr(2, 9),
          testId: state.currentTestId!,
          testTitle: state.currentTestTitle || 'Unknown Test',
          userId: 'current-user',
          startTime: state.sessionStartTime || Date.now(),
          endTime: now,
          score,
          totalMarks: state.questions.length * 2,
          questions: state.questions, // Store the exact questions for this attempt
          answers: state.answers,
          markedForReview: { ...state.markedForReview },
          timeSpent: finalTimeSpent,
          status: 'Completed'
        };

        set((state) => {
          // Remove existing 'In Progress' for this test to avoid resuming a completed test
          const filteredHistory = state.history.filter(h =>
            !(h.testId === state.currentTestId && h.status === 'In Progress')
          );

          return {
            history: [attempt, ...filteredHistory],
            library: [...newLibraryItems, ...state.library],
            currentTestId: null,
            currentTestTitle: null,
            questions: [],
            isPlaying: false,
            answers: {},
            markedForReview: {},
            timeSpent: {},
            questionVisitedAt: null,
          };
        });

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

      updateLibraryItemType: (itemId, newType) => set((state) => ({
        library: state.library.map(item =>
          item.id === itemId ? { ...item, type: newType } : item
        )
      })),

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
        // Active test state persistence
        currentTestId: state.currentTestId,
        currentTestTitle: state.currentTestTitle,
        questions: state.questions,
        currentIndex: state.currentIndex,
        answers: state.answers,
        markedForReview: state.markedForReview,
        timeRemaining: state.timeRemaining,
        totalTime: state.totalTime,
        sessionStartTime: state.sessionStartTime,
        isPlaying: state.isPlaying,
        hasSeenSwipeHint: state.hasSeenSwipeHint,
      }),
    }
  )
);
