import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  checkStreak: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, // Start logged out
      isAuthenticated: false,
      isLoading: true,

      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (data.user) {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const user: User = {
            id: data.user.id,
            email: data.user.email!,
            name: profile?.full_name || 'Student',
            isPro: profile?.is_pro || false,
            streak: profile?.streak || 0,
            lastActiveDate: profile?.last_active_at,
            avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          };

          set({ user, isAuthenticated: true });
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

        // Profile creation is handled by Supabase Trigger usually, 
        // but for safety we can create here if trigger fails or doesn't exist? 
        // Better to rely on Trigger. Assuming trigger acts on NEW.raw_user_meta_data

        if (data.user) {
          // Setup simple user object, full profile comes later
          const user: User = {
            id: data.user.id,
            email: data.user.email!,
            name: name,
            isPro: false,
            streak: 0,
          };
          set({ user, isAuthenticated: true });
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      checkSession: async () => {
        set({ isLoading: true });
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          // Fetch full profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          const user: User = {
            id: data.session.user.id,
            email: data.session.user.email!,
            name: profile?.full_name || 'Student',
            isPro: profile?.is_pro || false,
            streak: profile?.streak || 0,
            lastActiveDate: profile?.last_active_at,
            avatar: data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture,
          };
          set({ user, isAuthenticated: true, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkStreak: async () => {
        const state = get();
        if (!state.user) return;

        const today = new Date().toISOString().split('T')[0];
        const lastActive = state.user.lastActiveDate ? new Date(state.user.lastActiveDate).toISOString().split('T')[0] : null;

        if (lastActive === today) return; // Already logged today

        let newStreak = 1;
        if (lastActive) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastActive === yesterdayStr) {
            newStreak = (state.user.streak || 0) + 1;
          }
        }

        // Update Supabase
        await supabase
          .from('profiles')
          .update({
            streak: newStreak,
            last_active_at: new Date().toISOString()
          })
          .eq('id', state.user.id);

        // Update Local State
        set({
          user: {
            ...state.user,
            streak: newStreak,
            lastActiveDate: new Date().toISOString()
          }
        });
      }
    }),
    {
      name: 'auth-storage-supabase',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
