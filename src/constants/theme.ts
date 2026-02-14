import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// 8pt grid system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const colors = {
  light: {
    background: '#FFFFFF', // SystemBackground
    secondaryBackground: '#F2F2F7', // SystemGroupedBackground (Gray6)
    card: '#FFFFFF',
    text: '#000000', // Label
    textSecondary: '#3C3C4399', // SecondaryLabel (60% opacity)
    textTertiary: '#3C3C434D', // TertiaryLabel (30% opacity)
    primary: '#007AFF', // SystemBlue
    primaryLight: '#5856D6', // SystemIndigo (as accent)
    success: '#34C759', // SystemGreen
    warning: '#FF9500', // SystemOrange
    error: '#FF3B30', // SystemRed
    border: '#C6C6C8', // Opaque Separator (Gray3)
    separator: '#3C3C434D', // Non-Opaque Separator
    selected: '#E5EFFF',
  },
  dark: {
    background: '#000000', // SystemBackground
    secondaryBackground: '#1C1C1E', // SystemGroupedBackground (Gray6)
    card: '#1C1C1E', // Matching secondary for grouped look
    text: '#FFFFFF', // Label
    textSecondary: '#EBEBF599', // SecondaryLabel (60%)
    textTertiary: '#EBEBF54D', // TertiaryLabel (30%)
    primary: '#0A84FF', // SystemBlue Dark
    primaryLight: '#5E5CE6', // SystemIndigo Dark
    success: '#30D158', // SystemGreen Dark
    warning: '#FF9F0A', // SystemOrange Dark
    error: '#FF453A', // SystemRed Dark
    border: '#38383A', // Opaque Separator (Gray4)
    separator: '#54545899', // Non-Opaque Separator
    selected: '#1A3A5C',
  },
};

export const shadows = {
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  dark: {
    // Dark mode usually relies less on shadow and more on elevation/surface color
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
  },
};

export const layout = {
  window: { width, height },
  isSmallDevice: width < 375,
};
