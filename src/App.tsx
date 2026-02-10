import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, LinkingOptions, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AppNavigator, { RootStackParamList } from './navigation/AppNavigator';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Toast } from './components/common/Toast';
import * as Linking from 'expo-linking';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'testseriespro://', 'https://testseriespro.com'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Tests: 'tests',
          Library: 'library',
          Progress: 'progress',
          Profile: 'profile',
        },
      },
      TestInterface: 'test/:testId',
      Results: 'results/:attemptId',
      Solutions: 'solutions/:attemptId',
    },
  },
};

function NavigationWrapper() {
  const { isDark, colors } = useTheme();

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.error,
        },
        fonts: DefaultTheme.fonts,
      }}
    >
      <AppNavigator />
      <Toast />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <NavigationWrapper />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
