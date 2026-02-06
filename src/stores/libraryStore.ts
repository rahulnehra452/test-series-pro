import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LibraryItem, Question } from '../types';

interface LibraryState {
  items: Record<string, LibraryItem>; // Keyed by questionId

  // Actions
  saveQuestion: (questionId: string, note?: string) => void;
  removeFromLibrary: (questionId: string) => void;
  recordAttempt: (question: Question, isCorrect: boolean) => void;
  updateNote: (questionId: string, note: string) => void;
  getItemsByType: (type: LibraryItem['type']) => LibraryItem[];
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      items: {},

      saveQuestion: (questionId, note) =>
        set((state) => ({
          items: {
            ...state.items,
            [questionId]: {
              id: Math.random().toString(36).substr(2, 9),
              questionId,
              savedAt: Date.now(),
              type: 'Saved',
              note
            }
          }
        })),

      removeFromLibrary: (questionId) =>
        set((state) => {
          const newItems = { ...state.items };
          delete newItems[questionId];
          return { items: newItems };
        }),

      recordAttempt: (question, isCorrect) =>
        set((state) => {
          // Identify type based on correctness
          // Note: This logic might need refinement if we want to separate 'Saved' from 'Wrong/Correct' history checks
          // For MVP, we'll store Wrong/Correct status
          const type = isCorrect ? 'Correct' : 'Wrong';

          return {
            items: {
              ...state.items,
              [question.id]: {
                id: state.items[question.id]?.id || Math.random().toString(36).substr(2, 9),
                questionId: question.id,
                savedAt: Date.now(),
                type
              }
            }
          };
        }),

      updateNote: (questionId, note) =>
        set((state) => {
          if (!state.items[questionId]) return {};
          return {
            items: {
              ...state.items,
              [questionId]: { ...state.items[questionId], note }
            }
          };
        }),

      getItemsByType: (type) => {
        return Object.values(get().items).filter(item => item.type === type);
      }
    }),
    {
      name: 'library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
