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
import { Button } from '../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

export default function SignupScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { signup } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signup(email, password, name);
      if (result.status === 'email_confirmation_required') {
        Alert.alert(
          'Verify Your Email',
          'We sent a confirmation link to your email. Please verify your account before logging in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Something went wrong');
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join thousands of students
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
              value={name}
              onChangeText={setName}
            />
          </View>

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
            title="Sign Up"
            onPress={handleSignup}
            loading={loading}
            size="lg"
            style={styles.button}
          />

          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By signing up, you agree to our{' '}
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
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
  // buttonText style removed as it's handled by Button component
  footerText: {
    ...typography.caption1,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.md,
  }
});
