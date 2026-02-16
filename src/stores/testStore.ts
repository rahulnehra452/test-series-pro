import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, TestAttempt, LibraryItem, LibraryItemType, Difficulty } from '../types';
import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';
import { runtimeConfigValidation } from '../config/runtimeConfig';

interface StoreTestSeries {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  totalTests: number;
  totalQuestions: number;
  duration: number;
  price?: string;
  isPurchased: boolean;
}

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
  updateLibraryItemType: (itemId: string, newType: LibraryItemType) => Promise<void>;
  removeFromLibrary: (questionId: string, type?: LibraryItemType) => void;
  isQuestionInLibrary: (questionId: string, type?: LibraryItemType) => boolean;
  resetActiveTest: () => void;
  clearAllData: () => void;
  saveProgress: () => void;

  // Sync Actions
  tests: StoreTestSeries[];
  isLoadingTests: boolean;
  pendingUploads: TestAttempt[]; // Queue for failed uploads

  // Actions
  fetchTests: (force?: boolean) => Promise<void>;
  fetchQuestions: (testId: string) => Promise<Question[]>;

  // Pagination
  isLoadingMoreHistory: boolean;
  isFetchingHistory: boolean;
  hasMoreHistory: boolean;
  historyPage: number;
  historyError: string | null;
  fetchHistory: (page?: number) => Promise<void>;

  uploadAttempt: (attempt: TestAttempt) => Promise<void>;
  syncPendingUploads: () => Promise<void>;
  syncLibrary: () => Promise<void>;
  syncProgress: () => Promise<void>;
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

const toDbBookmarkType = (type: LibraryItemType): 'bookmark' | 'wrong' | 'note' => {
  if (type === 'wrong') return 'wrong';
  if (type === 'learn') return 'note';
  return 'bookmark';
};

const toAppLibraryType = (type: string): LibraryItemType => {
  if (type === 'wrong') return 'wrong';
  if (type === 'note') return 'learn';
  return 'saved';
};

const getLibraryKey = (item: Pick<LibraryItem, 'questionId' | 'type'>) => {
  return `${item.questionId}::${item.type}`;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_PATTERN.test(value);

const toDifficulty = (value?: string): Difficulty => {
  if (value === 'Easy' || value === 'Medium' || value === 'Hard') return value;
  return 'Medium';
};

// Known acronyms that should be uppercased
const UPPER_ACRONYMS = new Set(['ssc', 'cgl', 'upsc', 'rrb', 'ntpc', 'sbi', 'po', 'ias', 'nda', 'ibps', 'lic', 'cat', 'mba', 'gre', 'gmat', 'jee', 'neet', 'pre', 'mains', 'mpsc', 'bpsc', 'tnpsc', 'wbcs', 'ras', 'uppsc']);

const prettifyTestId = (testId: string) => {
  if (isUuid(testId)) return 'Practice Test';
  return testId
    .replace(/[-_]+/g, ' ')
    // separate trailing numbers from words: 'tier1' → 'tier 1'
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (UPPER_ACRONYMS.has(lower)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Extract exam name from slug: 'ssc-cgl-tier1' → 'SSC CGL'
const getExamFromTestId = (testId: string): string | null => {
  if (isUuid(testId)) return null;
  const parts = testId.split('-');
  // Take the first 1-2 parts that are known acronyms as the exam name
  const examParts: string[] = [];
  for (const part of parts) {
    if (UPPER_ACRONYMS.has(part.toLowerCase())) {
      examParts.push(part.toUpperCase());
    } else {
      // Stop at first non-acronym part (that's the test/tier detail)
      if (examParts.length > 0) break;
      examParts.push(part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    }
  }
  return examParts.length > 0 ? examParts.join(' ') : null;
};

const mapRemoteTestToStore = (test: any): StoreTestSeries => {
  const totalTests = Number(test.total_tests ?? 1);
  const totalQuestions = Number(test.total_questions ?? 0);
  const duration = Number(test.duration_minutes ?? test.duration ?? 60);
  const numericPrice = Number(test.price ?? 0);
  const hasPaidPrice = Number.isFinite(numericPrice) && numericPrice > 0;

  return {
    id: String(test.id),
    title: test.title || 'Practice Test',
    description: test.description || '',
    category: test.category || 'General',
    difficulty: toDifficulty(test.difficulty),
    totalTests: Number.isFinite(totalTests) && totalTests > 0 ? totalTests : 1,
    totalQuestions: Number.isFinite(totalQuestions) && totalQuestions >= 0 ? totalQuestions : 0,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 60,
    price: hasPaidPrice ? `₹${numericPrice}` : undefined,
    isPurchased: !hasPaidPrice,
  };
};

const getAnsweredCount = (answers: Record<string, number> = {}) => {
  return Object.values(answers).filter(value => value !== undefined && value !== null).length;
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
      isLoadingMoreHistory: false,
      isFetchingHistory: false,
      hasMoreHistory: true,
      historyPage: 0,
      historyError: null,
      library: [],
      hasSeenSwipeHint: false,
      markSwipeHintSeen: () => set({ hasSeenSwipeHint: true }),


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
        const completedTestId = state.currentTestId;

        // Capture time spent on the last question
        let finalTimeSpent = { ...state.timeSpent };
        const currentQ = state.questions[state.currentIndex];
        if (currentQ && state.questionVisitedAt && state.isPlaying) {
          const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
          finalTimeSpent[currentQ.id] = (finalTimeSpent[currentQ.id] || 0) + elapsed;
        }

        // Sync Library items (Wrong answers)
        const updatedLibrary = [...state.library];
        const newWrongItems: LibraryItem[] = [];
        state.questions.forEach(q => {
          const userAnswer = state.answers[q.id];
          if (userAnswer !== undefined) {
            if (userAnswer !== q.correctAnswer) {
              // Add to 'wrong' if not already there
              const alreadyExists = updatedLibrary.some(item => item.questionId === q.id && item.type === 'wrong');
              if (!alreadyExists) {
                const wrongItem: LibraryItem = {
                  id: Crypto.randomUUID(),
                  questionId: q.id,
                  question: q.text,
                  subject: q.subject,
                  difficulty: q.difficulty,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
                  explanation: q.explanation,
                  questionType: q.type,
                  type: 'wrong',
                  saveTimestamp: Date.now(),
                  exam: state.currentTestId || undefined,
                };
                updatedLibrary.unshift(wrongItem);
                newWrongItems.push(wrongItem);
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
            currentIndex: 0,
            timeRemaining: 0,
            totalTime: 0,
            endTime: null,
            sessionStartTime: null,
            isPlaying: false,
            answers: {},
            markedForReview: {},
            timeSpent: {},
            questionVisitedAt: null,
          };
        });

        // Trigger Sync
        get().uploadAttempt(attempt);
        if (newWrongItems.length > 0) {
          void (async () => {
            const { data: session } = await supabase.auth.getSession();
            if (!session.session?.user) return;

            const userId = session.session.user.id;
            for (const item of newWrongItems) {
              const { error } = await supabase.from('bookmarks').upsert({
                user_id: userId,
                question_id: item.questionId,
                type: toDbBookmarkType(item.type),
                question_data: {
                  text: item.question,
                  subject: item.subject,
                  difficulty: item.difficulty,
                  exam: item.exam,
                  options: item.options,
                  correctAnswer: item.correctAnswer,
                  explanation: item.explanation,
                  questionType: item.questionType,
                }
              }, { onConflict: 'user_id,question_id,type' });

              if (error) {
                console.error('Failed to sync wrong answer to cloud:', error);
              }
            }
          })();
        }

        // Once a test is completed, remove its cloud resume snapshot to prevent stale restores.
        if (completedTestId) {
          void (async () => {
            const { data: session } = await supabase.auth.getSession();
            if (!session.session?.user) return;

            const { error } = await supabase
              .from('test_progress')
              .delete()
              .eq('user_id', session.session.user.id)
              .eq('test_id', completedTestId);

            if (error) {
              console.error('Failed to clear completed test progress from cloud:', JSON.stringify(error, null, 2));
            }
          })();
        }

        return attempt;
      },


      fetchTests: async (force = false) => {
        const state = get();
        if (state.tests.length > 0 && !force) return;

        set({ isLoadingTests: true });
        try {
          const { data, error } = await supabase
            .from('tests')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching tests:', error);
            return;
          }

          if (data && data.length > 0) {
            const mappedTests = data.map(mapRemoteTestToStore);
            set({ tests: mappedTests });
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
          const isUUID = isUuid(testId);
          let targetTestId = testId;

          if (!isUUID) {
            // Non-UUID ids are likely local/mock ids; return [] so caller can use mock fallback.
            const mapped = get().tests.find(t => t.id === testId);
            if (mapped && isUuid(mapped.id)) {
              targetTestId = mapped.id;
            } else {
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
        // Guard against duplicate concurrent calls
        if (get().isFetchingHistory) return;
        set({ isFetchingHistory: true, historyError: null });

        try {
          const { data: session } = await supabase.auth.getSession();
          if (!session.session?.user) { set({ isFetchingHistory: false }); return; }

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
            .order('started_at', { ascending: false })
            .range(from, to);

          if (error) throw error;

          if (data) {
            const GENERIC_TITLES = ['Test Result', 'Practice Test', 'Unknown Test'];
            const knownTitles = new Map<string, string>();
            // 1. Seed from fetch'd tests catalog (best source)
            get().tests.forEach(test => {
              knownTitles.set(test.id, test.title);
            });
            // 2. Only fill gaps from existing history — skip generic titles
            get().history.forEach(attempt => {
              if (attempt.testTitle && !GENERIC_TITLES.includes(attempt.testTitle) && !knownTitles.has(attempt.testId)) {
                knownTitles.set(attempt.testId, attempt.testTitle);
              }
            });

            const uniqueTestIds = Array.from(
              new Set(
                data.map(d => String(d.test_id))
              )
            );

            // 3. Query tests table — these always take priority
            if (uniqueTestIds.length > 0) {
              const { data: testsData, error: testsError } = await supabase
                .from('tests')
                .select('id,title,category')
                .in('id', uniqueTestIds);

              if (!testsError && testsData) {
                testsData.forEach(test => {
                  if (test.id && test.title) {
                    knownTitles.set(String(test.id), test.title);
                  }
                });
              }
            }

            const mappedHistory: TestAttempt[] = data.map(d => ({
              id: d.id,
              testId: d.test_id,
              testTitle: knownTitles.get(String(d.test_id)) || prettifyTestId(String(d.test_id)),
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

            set(state => {
              const nonCompletedHistory = state.history.filter(attempt => attempt.status !== 'Completed');
              const existingCompleted = state.history.filter(attempt => attempt.status === 'Completed');
              const combinedCompleted = page === 0 ? mappedHistory : [...existingCompleted, ...mappedHistory];

              const dedupedCompletedMap = new Map<string, TestAttempt>();
              combinedCompleted.forEach(attempt => {
                dedupedCompletedMap.set(attempt.id, attempt);
              });

              const dedupedCompleted = Array.from(dedupedCompletedMap.values()).sort((a, b) => b.startTime - a.startTime);

              return {
                history: [...nonCompletedHistory, ...dedupedCompleted],
                hasMoreHistory: data.length === pageSize,
                historyPage: page,
                isLoadingMoreHistory: false,
              };
            });
          } else {
            set({ isLoadingMoreHistory: false });
          }
        } catch (e) {
          console.error('Error fetching history:', e);
          set({ historyError: 'Failed to load history' });
        } finally {
          set({ isFetchingHistory: false });
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
          set(state => ({
            pendingUploads: state.pendingUploads.some(a => a.id === attempt.id)
              ? state.pendingUploads
              : [...state.pendingUploads, attempt]
          }));
          return;
        }

        const user = session.session.user;

        const { error } = await supabase.from('attempts').insert({
          id: attempt.id,
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
              id: attempt.id,
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

      // Sync Actions
      syncLibrary: async () => {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) return;

        try {
          const localLibrary = get().library;
          // 1. Fetch cloud bookmarks
          const { data: cloudLibrary, error } = await supabase
            .from('bookmarks')
            .select('*');

          if (error) throw error;

          if (cloudLibrary) {
            const mappedLibrary: LibraryItem[] = cloudLibrary.map(item => {
              return {
                id: item.id,
                questionId: item.question_id,
                type: toAppLibraryType(item.type),
                question: item.question_data?.text || 'Question',
                subject: item.question_data?.subject,
                difficulty: item.question_data?.difficulty,
                options: item.question_data?.options,
                correctAnswer: item.question_data?.correctAnswer,
                explanation: item.question_data?.explanation,
                questionType: item.question_data?.questionType,
                saveTimestamp: new Date(item.created_at).getTime(),
                exam: item.question_data?.exam,
              };
            });

            // Merge cloud + local by question/type and keep the newest record.
            const merged = new Map<string, LibraryItem>();
            [...mappedLibrary, ...localLibrary].forEach(item => {
              const key = getLibraryKey(item);
              const existing = merged.get(key);
              if (!existing || item.saveTimestamp > existing.saveTimestamp) {
                merged.set(key, item);
              }
            });

            const mergedLibrary = Array.from(merged.values()).sort((a, b) => b.saveTimestamp - a.saveTimestamp);
            set({ library: mergedLibrary });
          }
        } catch (e) {
          console.error('Error syncing library:', e);
        }
      },

      syncProgress: async () => {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) return;

        try {
          const { data: cloudProgress, error } = await supabase
            .from('test_progress')
            .select('*');

          if (error) throw error;

          if (cloudProgress && cloudProgress.length > 0) {
            const stateSnapshot = get();
            const knownTitles = new Map<string, string>();

            stateSnapshot.tests.forEach(test => {
              knownTitles.set(test.id, test.title);
            });
            stateSnapshot.history.forEach(attempt => {
              if (attempt.testTitle) {
                knownTitles.set(attempt.testId, attempt.testTitle);
              }
            });

            const unknownUuidTestIds = Array.from(
              new Set(
                cloudProgress
                  .map(p => String(p.test_id))
                  .filter(testId => isUuid(testId) && !knownTitles.has(testId))
              )
            );

            if (unknownUuidTestIds.length > 0) {
              const { data: testsData, error: testsError } = await supabase
                .from('tests')
                .select('id,title')
                .in('id', unknownUuidTestIds);

              if (!testsError && testsData) {
                testsData.forEach(test => {
                  if (test.id && test.title) {
                    knownTitles.set(String(test.id), test.title);
                  }
                });
              }
            }

            const restoredAttempts: TestAttempt[] = cloudProgress.map(p => {
              const testId = String(p.test_id);
              const parsedCurrentIndex = Number(p.current_index ?? 0);
              const parsedTimeRemaining = p.time_remaining == null ? null : Number(p.time_remaining);
              const fallbackStart = new Date(p.last_updated_at).getTime();

              return {
                id: `${testId}-progress`,
                testId,
                testTitle: knownTitles.get(testId) || prettifyTestId(testId),
                userId: p.user_id,
                startTime: Number.isFinite(fallbackStart) ? fallbackStart : Date.now(),
                score: 0,
                totalMarks: 0,
                questions: [],
                answers: p.answers || {},
                markedForReview: p.marked_for_review || {},
                timeSpent: p.time_spent || {},
                currentIndex: Number.isFinite(parsedCurrentIndex) ? Math.max(0, parsedCurrentIndex) : 0,
                timeRemaining:
                  parsedTimeRemaining !== null && Number.isFinite(parsedTimeRemaining)
                    ? Math.max(0, parsedTimeRemaining)
                    : undefined,
                status: 'In Progress',
              };
            });

            set(state => {
              const completedHistory = state.history.filter(attempt => attempt.status !== 'In Progress');
              const existingInProgressByTestId = new Map<string, TestAttempt>();

              state.history
                .filter(attempt => attempt.status === 'In Progress')
                .forEach(attempt => {
                  existingInProgressByTestId.set(attempt.testId, attempt);
                });

              const mergedTestIds = new Set<string>();
              const mergedInProgress: TestAttempt[] = restoredAttempts.map(cloudAttempt => {
                const localAttempt = existingInProgressByTestId.get(cloudAttempt.testId);
                if (!localAttempt) {
                  mergedTestIds.add(cloudAttempt.testId);
                  return cloudAttempt;
                }

                const localStrength = (localAttempt.currentIndex ?? 0) + (getAnsweredCount(localAttempt.answers) * 1000);
                const cloudStrength = (cloudAttempt.currentIndex ?? 0) + (getAnsweredCount(cloudAttempt.answers) * 1000);
                const preferred = localStrength >= cloudStrength ? localAttempt : cloudAttempt;
                const fallback = preferred === localAttempt ? cloudAttempt : localAttempt;

                mergedTestIds.add(cloudAttempt.testId);

                return {
                  ...fallback,
                  ...preferred,
                  id: `${cloudAttempt.testId}-progress`,
                  testId: cloudAttempt.testId,
                  testTitle:
                    preferred.testTitle ||
                    fallback.testTitle ||
                    knownTitles.get(cloudAttempt.testId) ||
                    prettifyTestId(cloudAttempt.testId),
                  startTime: localAttempt.startTime || cloudAttempt.startTime || Date.now(),
                  questions: preferred.questions?.length ? preferred.questions : (fallback.questions || []),
                  answers: preferred.answers || fallback.answers || {},
                  markedForReview: preferred.markedForReview || fallback.markedForReview || {},
                  timeSpent: preferred.timeSpent || fallback.timeSpent || {},
                  currentIndex: preferred.currentIndex ?? fallback.currentIndex ?? 0,
                  timeRemaining: preferred.timeRemaining ?? fallback.timeRemaining,
                  score: preferred.score ?? fallback.score ?? 0,
                  totalMarks:
                    preferred.totalMarks ??
                    fallback.totalMarks ??
                    ((preferred.questions?.length || fallback.questions?.length || 0) * 2),
                  status: 'In Progress',
                };
              });

              existingInProgressByTestId.forEach((attempt, testId) => {
                if (!mergedTestIds.has(testId)) {
                  mergedInProgress.push(attempt);
                }
              });

              mergedInProgress.sort((a, b) => b.startTime - a.startTime);

              return { history: [...mergedInProgress, ...completedHistory] };
            });
          }
        } catch (e) {
          console.error('Error syncing progress:', e);
        }
      },

      addToLibrary: async (item) => {
        const state = get();
        // Optimistic update
        if (state.library.some(i => i.questionId === item.questionId && i.type === item.type)) return;

        const newItem: LibraryItem = { ...item, id: Crypto.randomUUID(), saveTimestamp: Date.now() };
        set({ library: [newItem, ...state.library] });

        // Cloud Sync
        const { data: session } = await supabase.auth.getSession();
        if (session.session?.user) {
          const dbType = toDbBookmarkType(item.type);

          const { error } = await supabase.from('bookmarks').upsert({
            user_id: session.session.user.id,
            question_id: item.questionId,
            type: dbType,
            question_data: {
              text: item.question,
              subject: item.subject,
              difficulty: item.difficulty,
              exam: item.exam,
              options: item.options,
              correctAnswer: item.correctAnswer,
              explanation: item.explanation,
              questionType: item.questionType,
            }
          }, { onConflict: 'user_id,question_id,type' });
          if (error) console.error('Failed to save bookmark to cloud:', error);
        }
      },

      removeFromLibrary: async (questionId, type) => {
        const state = get();
        // Optimistic update
        set({
          library: state.library.filter(i => {
            if (type) return !(i.questionId === questionId && i.type === type);
            return i.questionId !== questionId;
          })
        });

        // Cloud Sync
        const { data: session } = await supabase.auth.getSession();
        if (session.session?.user) {
          const dbType = type ? toDbBookmarkType(type) : undefined;

          let query = supabase.from('bookmarks').delete().eq('user_id', session.session.user.id).eq('question_id', questionId);
          if (dbType) query = query.eq('type', dbType);

          const { error } = await query;
          if (error) console.error('Failed to delete bookmark from cloud:', error);
        }
      },

      updateLibraryItemType: async (itemId, newType) => {
        const currentItem = get().library.find(item => item.id === itemId);
        if (!currentItem || currentItem.type === newType) return;

        const previousType = currentItem.type;
        const updatedAt = Date.now();

        // Optimistic update and dedupe to avoid two rows with same question/type.
        set(state => ({
          library: state.library
            .filter(item => !(item.id !== itemId && item.questionId === currentItem.questionId && item.type === newType))
            .map(item => item.id === itemId ? { ...item, type: newType, saveTimestamp: updatedAt } : item)
        }));

        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) return;

        const userId = session.session.user.id;
        const oldDbType = toDbBookmarkType(previousType);
        const newDbType = toDbBookmarkType(newType);

        try {
          const { error: deleteError } = await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', userId)
            .eq('question_id', currentItem.questionId)
            .eq('type', oldDbType);

          if (deleteError) throw deleteError;

          const { error: upsertError } = await supabase
            .from('bookmarks')
            .upsert({
              user_id: userId,
              question_id: currentItem.questionId,
              type: newDbType,
              question_data: {
                text: currentItem.question,
                subject: currentItem.subject,
                difficulty: currentItem.difficulty,
                exam: currentItem.exam,
                options: currentItem.options,
                correctAnswer: currentItem.correctAnswer,
                explanation: currentItem.explanation,
                questionType: currentItem.questionType,
              }
            }, { onConflict: 'user_id,question_id,type' });

          if (upsertError) throw upsertError;
        } catch (error) {
          console.error('Failed to update bookmark type in cloud:', error);
          // Roll back optimistic update if cloud sync fails.
          set(state => ({
            library: state.library.map(item =>
              item.id === itemId ? { ...item, type: previousType } : item
            )
          }));
        }
      },

      isQuestionInLibrary: (questionId, type) => {
        return get().library.some(i => {
          if (type) {
            return i.questionId === questionId && i.type === type;
          }
          return i.questionId === questionId;
        });
      },

      saveProgress: async () => {
        const state = get();
        if (!state.currentTestId) return;

        const now = Date.now();
        let finalTimeSpent = { ...state.timeSpent };
        const currentQ = state.questions[state.currentIndex];
        if (currentQ && state.questionVisitedAt) {
          const elapsed = Math.floor((now - state.questionVisitedAt) / 1000);
          finalTimeSpent[currentQ.id] = (finalTimeSpent[currentQ.id] || 0) + elapsed;
        }

        const currentAttempt: TestAttempt = {
          id: state.currentTestId + '-progress',
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

        // Local save logic
        set((existingState) => {
          const newHistory = existingState.history.filter(
            h => !(h.testId === state.currentTestId && h.status === 'In Progress')
          );

          return {
            history: [...newHistory, currentAttempt],
            timeSpent: finalTimeSpent,
            questionVisitedAt: existingState.isPlaying ? now : null,
          };
        });

        const { data: session } = await supabase.auth.getSession();
        if (session.session?.user) {
          const { error } = await supabase.from('test_progress').upsert({
            user_id: session.session.user.id,
            test_id: state.currentTestId,
            current_index: state.currentIndex,
            answers: state.answers,
            marked_for_review: state.markedForReview,
            time_spent: finalTimeSpent,
            time_remaining: state.timeRemaining,
            last_updated_at: new Date(now).toISOString()
          }, { onConflict: 'user_id,test_id' }); // Ensure composite PK matches

          if (error) console.error('Failed to save progress to cloud:', error);
        }
      },


      resetActiveTest: () => set({
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
      }),

      clearAllData: () => set({
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
      }),

      hasHydrated: false,
      setHasHydrated: (state) => {
        set({ hasHydrated: state });
        if (state && runtimeConfigValidation.isValid) {
          // Trigger initial syncs
          get().syncLibrary();
          get().syncProgress();
        }
      },
    }),
    {
      name: 'test-series-data',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        history: state.history.slice(0, 20),
        library: state.library,
        pendingUploads: state.pendingUploads,
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
