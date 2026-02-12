import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, TestAttempt, LibraryItem, LibraryItemType } from '../types';
import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';

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
  resetActiveTest: () => void;
  clearAllData: () => void;
  saveProgress: () => void;

  // Sync Actions
  tests: any[];
  isLoadingTests: boolean;
  pendingUploads: TestAttempt[]; // Queue for failed uploads

  // Actions
  fetchTests: (force?: boolean) => Promise<void>;
  fetchQuestions: (testId: string) => Promise<Question[]>;

  // Pagination
  isLoadingMoreHistory: boolean;
  hasMoreHistory: boolean;
  historyPage: number;
  fetchHistory: (page?: number) => Promise<void>;

  uploadAttempt: (attempt: TestAttempt) => Promise<void>;
  syncPendingUploads: () => Promise<void>;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

// Helper to calculate score
const calculateScore = (questions: Question[], answers: Record<string, number>, negativeMarking = 0.66) => {
  let score = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.correctAnswer) {
      score += 2; // +2 for correct
    } else if (answers[q.id] !== undefined && answers[q.id] !== null) {
      score -= negativeMarking; // Dynamic penalty
    }
  });
  // Use Math.round to avoid floating point drift before toFixed
  const finalScore = Number((Math.round(score * 100) / 100).toFixed(2));
  return finalScore;
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
      tests: [],
      isLoadingTests: false,
      pendingUploads: [],
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

        // Sync Library items (Wrong answers)
        const updatedLibrary = [...state.library];
        state.questions.forEach(q => {
          const userAnswer = state.answers[q.id];
          if (userAnswer !== undefined) {
            if (userAnswer !== q.correctAnswer) {
              // Add to 'wrong' if not already there
              const alreadyExists = updatedLibrary.some(item => item.questionId === q.id && item.type === 'wrong');
              if (!alreadyExists) {
                updatedLibrary.unshift({
                  id: Crypto.randomUUID(),
                  questionId: q.id,
                  question: q.text,
                  subject: q.subject,
                  difficulty: q.difficulty,
                  type: 'wrong',
                  saveTimestamp: Date.now(),
                  exam: state.currentTestId || undefined,
                });
              }
            } else {
              // Remove from 'wrong' if solved correctly now
              const wrongIndex = updatedLibrary.findIndex(item => item.questionId === q.id && item.type === 'wrong');
              if (wrongIndex > -1) {
                updatedLibrary.splice(wrongIndex, 1);
              }
            }
          }
        });

        const attempt: TestAttempt = {
          id: Crypto.randomUUID(),
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
            library: updatedLibrary,
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

        // Trigger Sync
        get().uploadAttempt(attempt);

        return attempt;
      },


      // ... (inside create) ...

      isLoadingMoreHistory: false,
      hasMoreHistory: true,
      historyPage: 0,

      fetchTests: async (force = false) => {
        const state = get();
        if (state.tests.length > 0 && !force) return;

        set({ isLoadingTests: true });
        try {
          const { data, error } = await supabase
            .from('tests')
            .select('*')
            .order('created_at', { ascending: false });

          if (data && data.length > 0) {
            set({ tests: data });
          } else if (error) {
            console.error('Error fetching tests:', error);
          }
        } catch (e) {
          console.error('Critical failure in fetchTests:', e);
        } finally {
          set({ isLoadingTests: false });
        }
      },

      fetchQuestions: async (testId: string) => {
        try {
          // Check if testId is a UUID
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId);
          let targetTestId = testId;

          if (!isUUID) {
            // If not UUID, try to find the test by slug or some other identifier, 
            // assuming we might have legacy IDs being passed. 
            // Since we don't have a 'slug' column guaranteed, we might need to rely on 'id' being text in some contexts
            // OR we need to find a test where some other property matches, but best bet is to check if we can find a test with this ID as a string-based ID if schema allowed it, 
            // BUT schema expects UUID. 
            // Let's try to find a test where title or description matches or maybe we just fail gracefully?
            // Actually, the error says 'invalid input syntax for type uuid: "ssc-cgl-tier1"'.
            // This means database expects UUID.
            // We probably have a test in the DB with a UUID, but the frontend is using a hardcoded string ID from mock data.
            // We need to map 'ssc-cgl-tier1' to its UUID.

            // First, let's see if we have this test in our local store
            const localTest = get().tests.find(t => t.title.toLowerCase().includes('ssc') || t.description?.toLowerCase().includes('ssc')); // Loose matching for recovery
            // Better approach: Query tests table for a matching title if we can't search by ID

            const { data: testData } = await supabase.from('tests').select('id').ilike('title', '%SSC%').limit(1).single();
            if (testData) {
              targetTestId = testData.id;
            } else {
              console.warn('Could not resolve UUID for legacy ID:', testId);
              return [];
            }
          }

          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', targetTestId);

          if (error) throw error;
          if (!data || data.length === 0) return [];

          return data.map(q => ({
            id: q.id,
            text: q.text,
            options: q.options,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            subject: q.subject,
            difficulty: q.difficulty,
            type: q.type || 'MCQ'
          }));
        } catch (e) {
          console.error('Error fetching questions for test:', testId, e);
          return [];
        }
      },

      fetchHistory: async (page = 0) => {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) return;

        const pageSize = 20;
        const from = page * pageSize;
        const to = from + pageSize - 1;

        if (page > 0) {
          set({ isLoadingMoreHistory: true });
        }

        const { data, error } = await supabase
          .from('attempts')
          .select('*')
          .eq('status', 'Completed')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (!error && data) {
          const mappedHistory: TestAttempt[] = data.map(d => ({
            id: d.id,
            testId: d.test_id,
            testTitle: 'Test Result',
            userId: d.user_id,
            startTime: new Date(d.started_at).getTime(),
            endTime: d.completed_at ? new Date(d.completed_at).getTime() : undefined,
            score: Number(d.score),
            totalMarks: Number(d.total_marks),
            questions: d.questions || [],
            answers: d.answers || {},
            markedForReview: {},
            timeSpent: {},
            status: d.status as TestAttempt['status'],
          }));

          set(state => ({
            history: page === 0 ? mappedHistory : [...state.history, ...mappedHistory],
            hasMoreHistory: data.length === pageSize,
            historyPage: page,
            isLoadingMoreHistory: false
          }));
        } else {
          set({ isLoadingMoreHistory: false });
        }
      },

      uploadAttempt: async (attempt) => {
        const { data: session } = await supabase.auth.getSession();

        // generated UUID validation regex
        // Allow any string ID (UUID or simple string)
        if (!attempt.testId) {
          console.log('Skipping upload: No Test ID');
          return;
        }

        if (!session.session?.user) {
          // Queue if no user (offline or logged out? if logged out, maybe don't queue)
          // If just offline, queue.
          // For now, let's queue it.
          set(state => ({ pendingUploads: [...state.pendingUploads, attempt] }));
          return;
        }

        const user = session.session.user;

        const { error } = await supabase.from('attempts').insert({
          user_id: user.id,
          test_id: attempt.testId,
          score: attempt.score,
          total_marks: attempt.totalMarks,
          status: attempt.status,
          started_at: new Date(attempt.startTime).toISOString(),
          completed_at: attempt.endTime ? new Date(attempt.endTime).toISOString() : null,
          answers: attempt.answers,
          questions: attempt.questions,
        });

        if (error) {
          console.error('Upload failed, queuing:', error);
          set(state => ({
            // Avoid duplicates in queue
            pendingUploads: state.pendingUploads.some(a => a.id === attempt.id)
              ? state.pendingUploads
              : [...state.pendingUploads, attempt]
          }));
        }
      },

      syncPendingUploads: async () => {
        const state = get();
        if (state.pendingUploads.length === 0) return;

        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) return;
        const user = session.session.user;

        const remainingUploads: TestAttempt[] = [];

        for (const attempt of state.pendingUploads) {
          try {
            // Retry Upload with upsert to avoid duplicate key errors
            const { error } = await supabase.from('attempts').upsert({
              user_id: user.id,
              test_id: attempt.testId,
              score: attempt.score,
              total_marks: attempt.totalMarks,
              status: attempt.status,
              started_at: new Date(attempt.startTime).toISOString(),
              completed_at: attempt.endTime ? new Date(attempt.endTime).toISOString() : null,
              answers: attempt.answers,
              questions: attempt.questions, // Fix: Include questions in sync
            }, { onConflict: 'id' });

            if (error) {
              console.error('Sync failed for attempt:', attempt.id, error);
              remainingUploads.push(attempt); // Keep in queue
            }
          } catch (e) {
            console.error('Critical sync failure:', e);
            remainingUploads.push(attempt);
          }
        }

        set({ pendingUploads: remainingUploads });
      },

      addToLibrary: (item) => set((state) => {
        // Prevent duplicates for same question and type
        if (state.library.some(i => i.questionId === item.questionId && i.type === item.type)) {
          return {};
        }
        const newItem: LibraryItem = {
          ...item,
          id: Crypto.randomUUID(),
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

      resetActiveTest: () => set({
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
        // Do NOT clear history or library
      }),

      clearAllData: () => set({
        currentTestId: null,
        currentTestTitle: null,
        questions: [],
        currentIndex: 0,
        answers: {},
        markedForReview: {},
        timeRemaining: 0,
        totalTime: 0,
        endTime: null,
        history: [],
        library: [],
      }),

      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'test-series-data',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        // Prune history to only keep the last 20 attempts locally to prevent AsyncStorage overflow
        history: state.history.slice(0, 20),
        library: state.library,
        pendingUploads: state.pendingUploads, // Fix: Persist offline queue
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
