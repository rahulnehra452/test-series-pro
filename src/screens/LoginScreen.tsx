import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { spacing, typography, borderRadius } from '../constants/theme';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const OAUTH_SCHEME = 'testkra';

type OAuthCallbackParams = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
};

const parseOAuthCallbackParams = (callbackUrl: string): OAuthCallbackParams => {
  const queryPart = callbackUrl.includes('?')
    ? callbackUrl.split('?')[1]?.split('#')[0] ?? ''
    : '';
  const hashPart = callbackUrl.includes('#') ? callbackUrl.split('#')[1] : '';
  const params = new URLSearchParams(
    [queryPart, hashPart].filter(Boolean).join('&')
  );

  return {
    code: params.get('code'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
};

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const performOAuth = async () => {
    try {
      const redirectUrl = makeRedirectUri({
        scheme: OAUTH_SCHEME,
      });

      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        Alert.alert('Google Sign-In Error', error.message);
        return;
      }

      if (!data?.url) {
        Alert.alert('Google Sign-In Error', 'No OAuth URL returned from server.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type !== 'success') {
        if (result.type !== 'cancel' && result.type !== 'dismiss') {
          Alert.alert('Login Incomplete', `Auth session ended with type: ${result.type}`);
        }
        return;
      }

      const parsed = parseOAuthCallbackParams(result.url);
      if (parsed.error) {
        Alert.alert(
          'Google Sign-In Error',
          parsed.errorDescription ?? parsed.error
        );
        return;
      }

      if (parsed.code) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (sessionError) {
          Alert.alert('Session Error', sessionError.message);
          return;
        }

        await useAuthStore.getState().checkSession();
        return;
      }

      if (parsed.accessToken && parsed.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });

        if (sessionError) {
          Alert.alert('Session Error', sessionError.message);
          return;
        }

        await useAuthStore.getState().checkSession();
        return;
      }

      Alert.alert(
        'Login Failed',
        'Could not read the OAuth callback on this device. Please try again.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Success is handled by authStore updating state
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, padding: 24, justifyContent: 'center' }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to continue your progress
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.button}
          />

          <Button
            title="Sign in with Google"
            variant="outline"
            size="lg"
            onPress={performOAuth}
            disabled={loading}
            leftIcon={<Ionicons name="logo-google" size={20} color={colors.text} />}
            style={{ marginBottom: spacing.md }}
          />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={{ color: colors.textSecondary }}>
              Don't have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By continuing, you agree to our{' '}
            <Text
              style={{ color: colors.primary }}
              onPress={() => WebBrowser.openBrowserAsync('https://testkra.com/terms')}
            >
              Terms of Service
            </Text> and{' '}
            <Text
              style={{ color: colors.primary }}
              onPress={() => WebBrowser.openBrowserAsync('https://testkra.com/privacy')}
            >
              Privacy Policy
            </Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing['3xl'],
  },
  title: {
    ...typography.largeTitle,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.subhead,
  },
  form: {
    gap: spacing.base,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    // height: 56, // Handled by Input component now
  },
  icon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  button: {
    // height: 56, // Handled by size="lg" prop
    // borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF', // Provide default white for primary button text
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    ...typography.caption1,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xl,
  }
});
