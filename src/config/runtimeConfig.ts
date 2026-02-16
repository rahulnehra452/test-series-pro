type RuntimeConfig = {
  build: {
    isDevelopment: boolean;
    isRelease: boolean;
  };
  supabase: {
    url: string;
    anonKey: string;
    isConfigured: boolean;
  };
  billing: {
    androidProductIds: string[];
    isConfigured: boolean;
  };
  features: {
    allowMockFallback: boolean;
  };
};

type RuntimeConfigValidation = {
  isValid: boolean;
  missingRequiredEnv: string[];
};

const readEnv = (key: string): string => (process.env[key] || '').trim();

const parseCsvEnv = (key: string): string[] => {
  const value = readEnv(key);
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const isDevelopment = __DEV__;
const isRelease = !isDevelopment;

const supabaseUrl = readEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const androidProductIds = parseCsvEnv('EXPO_PUBLIC_ANDROID_BILLING_PRODUCT_IDS');
const allowMockFallbackOverride = readEnv('EXPO_PUBLIC_ENABLE_MOCK_FALLBACK').toLowerCase();

const missingRequiredEnv: string[] = [];
if (!supabaseUrl) missingRequiredEnv.push('EXPO_PUBLIC_SUPABASE_URL');
if (!supabaseAnonKey) missingRequiredEnv.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const runtimeConfig: RuntimeConfig = {
  build: {
    isDevelopment,
    isRelease,
  },
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  },
  billing: {
    androidProductIds,
    isConfigured: androidProductIds.length > 0,
  },
  features: {
    allowMockFallback: isDevelopment || allowMockFallbackOverride === 'true',
  },
};

export const runtimeConfigValidation: RuntimeConfigValidation = {
  isValid: missingRequiredEnv.length === 0,
  missingRequiredEnv,
};

export const isProductionBillingEnabled =
  !runtimeConfig.build.isRelease || runtimeConfig.billing.isConfigured;
