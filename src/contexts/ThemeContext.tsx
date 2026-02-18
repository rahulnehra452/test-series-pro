import React, { createContext, useContext, useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import { colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themePreference: ThemeType;
  setThemePreference: (theme: ThemeType) => void;
  colors: typeof colors.light;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemeType>('system');
  const [theme, setTheme] = useState<'light' | 'dark'>(systemColorScheme === 'dark' ? 'dark' : 'light');

  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (themePreference === 'system') {
      setTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setTheme(themePreference);
    }
  }, [themePreference, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('theme_preference');
      if (storedTheme) {
        setThemePreference(storedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Failed to load theme preference', error);
    } finally {
      setIsThemeLoaded(true);
    }
  };

  const updateThemePreference = async (newTheme: ThemeType) => {
    setThemePreference(newTheme);
    try {
      await AsyncStorage.setItem('theme_preference', newTheme);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };

  const activeColors = theme === 'dark' ? colors.dark : colors.light;

  if (!isThemeLoaded) {
    const bootColors = theme === 'dark' ? colors.dark : colors.light;
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bootColors.background }]}>
        <ActivityIndicator size="large" color={bootColors.primary} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference: updateThemePreference,
        colors: activeColors,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
