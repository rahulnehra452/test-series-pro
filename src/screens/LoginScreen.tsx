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
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession(); // Ensure auth session completionative-safe-area-context';

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
        scheme: 'testseriespro',
      });
      // console.log('generated redirectUrl:', redirectUrl);

      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      // console.log('Supabase OAuth initiated');

      if (error) Alert.alert('Google Sign-In Error', error.message);
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        // console.log('WebBrowser Result Type:', result.type);

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.search);
          const code = params.get('code');

          // 1. Try PKCE Flow (Code Exchange)
          if (code) {
            console.log('Found OAuth Code, exchanging...');
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) {
              Alert.alert('Session Error (Code)', sessionError.message);
              return;
            }
            await useAuthStore.getState().checkSession();
            return;
          }

          // 2. Try Implicit Flow (Hash Tokens)
          // URLSearchParams usually works on query string, need to handle hash manually if not parsed by URL object
          // Some environments might put it in search, others in hash.
          const hashParams = new URLSearchParams(result.url.split('#')[1]);
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');

          if (access_token && refresh_token) {
            console.log('Found Access Token, setting session...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              Alert.alert('Session Error (Token)', sessionError.message);
              return;
            }
            await useAuthStore.getState().checkSession();
          } else {
            console.log('No code or tokens found in URL');
            Alert.alert('Login Failed', 'Could not parse login info from validation.');
          }
        }
      }
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
            style={styles.button}
          />

          <Button
            title="Sign in with Google"
            variant="outline"
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  }
});
