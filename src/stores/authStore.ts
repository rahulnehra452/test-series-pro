import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  reset: () => void;
  checkStreak: () => void;
}

const MOCK_USER: User = {
  id: 'u1',
  name: 'Student User',
  email: 'student@example.com',
  isPro: true,
  streak: 5,
  lastActiveDate: '2026-02-06',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: MOCK_USER, // Default to logged in for MVP
      isAuthenticated: true,

      login: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      checkStreak: () => set((state) => {
        if (!state.user) return {};

        const today = new Date().toISOString().split('T')[0];
        const lastActive = state.user.lastActiveDate;

        if (lastActive === today) return {}; // Already tallied for today

        let newStreak = 1;
        if (lastActive) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastActive === yesterdayStr) {
            newStreak = (state.user.streak || 0) + 1;
          }
        }

        return {
          user: {
            ...state.user,
            streak: newStreak,
            lastActiveDate: today
          }
        };
      }),

      reset: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
