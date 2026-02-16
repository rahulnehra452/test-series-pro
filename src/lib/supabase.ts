
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runtimeConfig } from '../config/runtimeConfig';

const SUPABASE_URL = runtimeConfig.supabase.url || 'https://invalid.supabase.local';
const SUPABASE_ANON_KEY = runtimeConfig.supabase.anonKey || 'invalid-anon-key';

export const isSupabaseConfigured = runtimeConfig.supabase.isConfigured;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
