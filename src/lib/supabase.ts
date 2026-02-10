
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Better to use environment variables, but for now placeholders are fine
// User will need to replace these
const SUPABASE_URL = 'https://ihvnklncvlvlhxfgfsbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlodm5rbG5jdmx2bGh4Zmdmc2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDM4OTAsImV4cCI6MjA4NjI3OTg5MH0.0Ug4m1ItZ17AKqI4w7Di80uosE8spNDZNGIgkZ6tb7c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
