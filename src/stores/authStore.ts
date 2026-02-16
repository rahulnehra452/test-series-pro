import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { useTestStore } from './testStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  checkStreak: () => Promise<void>;
  updateProfile: (updates: { name?: string; email?: string }) => Promise<void>;
  activatePro: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

// Helper to trigger sync
const triggerSync = () => {
  const { syncLibrary, syncProgress } = useTestStore.getState();
  syncLibrary();
  syncProgress();
};

const LOGIN_TIMEOUT_MS = 15000;
const SESSION_TIMEOUT_MS = 10000;
const PROFILE_TIMEOUT_MS = 8000;

const withTimeout = <T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    Promise.resolve(promise)
      .then(value => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, // Start logged out
      isAuthenticated: false,
      isLoading: true,
      hasHydrated: false,

      setHasHydrated: (state) => set({ hasHydrated: state }),

      login: async (email, password) => {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password
          }),
          LOGIN_TIMEOUT_MS,
          'Login timed out. Please check your internet connection and try again.'
        );

        if (error) throw error;

        if (data.user) {
          const user: User = {
            id: data.user.id,
            email: data.user.email!,
            name: 'Student',
            isPro: false,
            streak: 0,
            avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          };

          set({ user, isAuthenticated: true });
          triggerSync();

          // Hydrate profile data in background so login navigation is never blocked by profile query latency.
          void (async () => {
            try {
              const { data: profile } = await withTimeout<{ data: any; error: any }>(
                supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', data.user!.id)
                  .maybeSingle(),
                PROFILE_TIMEOUT_MS,
                'Profile fetch timed out after login.'
              );

              if (profile) {
                set(state => ({
                  user: state.user ? {
                    ...state.user,
                    name: profile.full_name || state.user.name,
                    isPro: profile.is_pro || false,
                    streak: profile.streak || 0,
                    lastActiveDate: profile.last_active_at,
                  } : null
                }));
              }
            } catch (profileError) {
              console.error('Failed to hydrate profile after login:', profileError);
            }
          })();
        }
      },

      signup: async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        });

        if (error) throw error;

        if (data.user) {
          // Setup initial user state from metadata immediately
          const user: User = {
            id: data.user.id,
            email: data.user.email!,
            name: name,
            isPro: false,
            streak: 0,
            avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          };
          set({ user, isAuthenticated: true });
          triggerSync();

          // Instead of a brittle setTimeout, we'll try to fetch the profile several times
          // with exponential backoff if it's missing.
          const fetchProfileWithRetry = async (retryCount = 0) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user!.id)
              .single();

            if (profile) {
              set(state => ({
                user: state.user ? {
                  ...state.user,
                  name: profile.full_name || state.user.name,
                  isPro: profile.is_pro || false,
                  streak: profile.streak || 0,
                } : null
              }));
            } else if (retryCount < 3) {
              // Retry after 1s, 2s, 4s
              setTimeout(() => fetchProfileWithRetry(retryCount + 1), Math.pow(2, retryCount) * 1000);
            }
          };

          fetchProfileWithRetry();
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await withTimeout(
            supabase.auth.getSession(),
            SESSION_TIMEOUT_MS,
            'Session check timed out.'
          );

          const errorMessage = error?.message || '';
          if (error && errorMessage.includes('invalid_grant')) {
            // Token refresh failed, force logout
            await get().logout();
            return;
          }

          if (error) {
            throw error;
          }

          if (data.session?.user) {
            // Fetch full profile
            const { data: profile } = await withTimeout<{ data: any; error: any }>(
              supabase
                .from('profiles')
                .select('*')
                .eq('id', data.session.user.id)
                .maybeSingle(),
              PROFILE_TIMEOUT_MS,
              'Profile restore timed out.'
            );

            const user: User = {
              id: data.session.user.id,
              email: data.session.user.email!,
              name: profile?.full_name || 'Student',
              isPro: profile?.is_pro || false,
              streak: profile?.streak || 0,
              lastActiveDate: profile?.last_active_at,
              avatar: data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture,
            };
            set({ user, isAuthenticated: true });
            triggerSync();
            return;
          }

          set({ user: null, isAuthenticated: false });
        } catch (error) {
          console.error('Error checking session:', error);
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      checkStreak: async () => {
        const state = get();
        if (!state.user || !state.isAuthenticated) return;

        const today = new Date().toISOString().split('T')[0];
        const lastActiveDateStr = state.user.lastActiveDate ? new Date(state.user.lastActiveDate).toISOString().split('T')[0] : null;

        if (lastActiveDateStr === today) return;

        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastActiveDateStr === yesterdayStr) {
          newStreak = (state.user.streak || 0) + 1;
        }

        // Update Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            streak: newStreak,
            last_active_at: now.toISOString()
          })
          .eq('id', state.user.id);

        if (!error) {
          set({
            user: {
              ...state.user,
              streak: newStreak,
              lastActiveDate: now.toISOString()
            }
          });
        }
      },

      updateProfile: async (updates) => {
        const state = get();
        if (!state.user) return;

        if (updates.name) {
          const { error } = await supabase
            .from('profiles')
            .update({ full_name: updates.name })
            .eq('id', state.user.id);

          if (error) throw error;

          await supabase.auth.updateUser({
            data: { full_name: updates.name }
          });
        }

        set({
          user: {
            ...state.user,
            name: updates.name || state.user.name,
            email: updates.email || state.user.email,
          }
        });
      },

      activatePro: async () => {
        const state = get();
        if (!state.user) {
          throw new Error('Please log in to activate Pro.');
        }
        if (state.user.isPro) {
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .update({ is_pro: true })
          .eq('id', state.user.id);

        if (error) {
          throw error;
        }

        set({
          user: {
            ...state.user,
            isPro: true,
          }
        });
      },

      deleteAccount: async () => {
        const state = get();
        if (!state.user) return;

        // 1. Delete user profile and data (cascades)
        // Note: For full auth deletion, an edge function is usually needed.
        // This deletes the public profile and user data.
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', state.user.id);

        if (error) throw error;

        // 2. Sign out
        await get().logout();
      },
    }),
    {
      name: 'test-series-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      }
    }
  )
);
