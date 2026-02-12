import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

// Screens
import HomeScreen from '../screens/HomeScreen';
import TestsScreen from '../screens/TestsScreen';
import LibraryScreen from '../screens/LibraryScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TestInterfaceScreen from '../screens/TestInterfaceScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SolutionsScreen from '../screens/SolutionsScreen';
import SeedDataScreen from '../screens/SeedDataScreen'; // Hidden
import PricingScreen from '../screens/PricingScreen';

// Types
import { TestAttempt } from '../types';

import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Tests: undefined;
  Library: undefined;
  Progress: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#636366', // Darker gray for better visibility
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderTopColor: colors.border,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 0.5,
        },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={80}
            style={{ flex: 1 }}
          />
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tests') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Library') {
            iconName = focused ? 'bookmarks' : 'bookmarks-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tests" component={TestsScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Progress" component={StatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { LoadingScreen } from '../components/common/LoadingScreen';

// ... (Keep existing imports)

export type RootStackParamList = {
  Auth: undefined; // New Auth Group
  Main: NavigatorScreenParams<MainTabParamList>;
  TestInterface: { testId: string; testTitle: string };
  Results: { attemptId?: string; result?: TestAttempt };
  Solutions: { attemptId?: string; result?: TestAttempt };
  SeedData: undefined;
  Pricing: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  const { colors } = useTheme();
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading, hasHydrated } = useAuthStore();

  if (isLoading || !hasHydrated) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="TestInterface"
            component={TestInterfaceScreen}
            options={{
              gestureEnabled: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Results"
            component={ResultsScreen}
            options={{
              animation: 'slide_from_bottom',
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Solutions"
            component={SolutionsScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="SeedData" component={SeedDataScreen} />
          <Stack.Screen
            name="Pricing"
            component={PricingScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom'
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
