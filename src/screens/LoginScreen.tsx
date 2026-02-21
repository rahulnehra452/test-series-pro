import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { handleError, showAlert } from '../utils/errorHandler';
import { spacing, typography, borderRadius } from '../constants/theme'; // Ensure borderRadius imported
import { Button } from '../components/common/Button';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

WebBrowser.maybeCompleteAuthSession();

const OAUTH_SCHEME = 'testkra';
const { width } = Dimensions.get('window');

// ... (OAuth helpers remain same) ...
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
        showAlert('Google Sign-In Error', handleError(error, 'Login:GoogleSignIn'));
        return;
      }

      if (!data?.url) {
        showAlert('Google Sign-In Error', 'No OAuth URL returned from server.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type !== 'success') {
        if (result.type !== 'cancel' && result.type !== 'dismiss') {
          showAlert('Login Incomplete', `Auth session ended with type: ${result.type}`);
        }
        return;
      }

      const parsed = parseOAuthCallbackParams(result.url);
      if (parsed.error) {
        showAlert(
          'Google Sign-In Error',
          parsed.errorDescription ?? parsed.error ?? 'Unknown error'
        );
        return;
      }

      if (parsed.code) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (sessionError) {
          showAlert('Session Error', handleError(sessionError, 'Login:ExchangeCode'));
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
          showAlert('Session Error', handleError(sessionError, 'Login:SetSession'));
          return;
        }

        await useAuthStore.getState().checkSession();
        return;
      }

      showAlert(
        'Login Failed',
        'Could not read the OAuth callback on this device. Please try again.'
      );
    } catch (error: any) {
      showAlert('Error', handleError(error, 'Login:OAuhFlow'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Subtle Background Gradient */}
      <LinearGradient
        colors={isDark ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)'] : ['rgba(255,255,255,0)', 'rgba(240,240,245,0.5)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>

          {/* Hero Section */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.heroSection}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#F2F2F7' }]}>
              {/* Replace with actual App Logo if available */}
              <Ionicons name="school" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>TestKra</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Master your exams with intelligent testing.
            </Text>
          </Animated.View>

          {/* Auth Section */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.authSection}>
            <View style={styles.card}>
              <Text style={[styles.welcomeText, { color: colors.text }]}>Get Started</Text>

              <Button
                title="Continue with Google"
                onPress={performOAuth}
                disabled={loading}
                loading={loading}
                size="lg"
                variant="primary" // Changed to primary for better visibility
                leftIcon={<Ionicons name="logo-google" size={20} color="#FFF" />}
                style={[styles.googleButton]}
              />
              <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
                No password required. Secure and fast.
              </Text>
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              By continuing, you agree to our{' '}
              <Text
                style={[styles.linkText, { color: colors.primary }]}
                onPress={() => WebBrowser.openBrowserAsync('https://testkra.com/terms')}
              >
                Terms
              </Text> &{' '}
              <Text
                style={[styles.linkText, { color: colors.primary }]}
                onPress={() => WebBrowser.openBrowserAsync('https://testkra.com/privacy')}
              >
                Privacy Policy
              </Text>.
            </Text>
          </Animated.View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
    gap: spacing.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    // Add nice shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800', // Heavy weight for Apple feel
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  authSection: {
    width: '100%',
    marginBottom: spacing['2xl'],
  },
  card: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  googleButton: {
    width: '100%',
    height: 56, // Taller button
    borderRadius: 28, // Pill shape
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.7,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    fontWeight: '600',
  }
});
