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
    primary: '#007AFF', // SystemBlue - Primary Actions Only
    primaryLight: '#5856D6', // SystemIndigo (as accent)
    success: '#34C759', // SystemGreen - Success Only
    warning: '#FF9500', // SystemOrange - Warnings/Caution Only
    error: '#FF3B30', // SystemRed - Errors/Destructive Only
    border: '#C6C6C8', // Opaque Separator (Gray3)
    separator: '#3C3C434D', // Non-Opaque Separator
    selected: '#E5EFFF',

    // Subject Colors (Distinct from Semantic Colors)
    subject: {
      history: '#A0522D', // Sienna
      polity: '#4682B4', // SteelBlue
      economy: '#9B59B6', // Amethyst (Purple) - Distinct from Success Green
      geography: '#D35400', // Pumpkin - Distinct from Warning Orange
      science: '#1ABC9C', // Turquoise
      environment: '#27AE60', // Nephritis
      currentAffairs: '#E67E22', // Carrot
      other: '#95A5A6', // Concrete
    }
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

    // Subject Colors (Dark Mode variations if needed, keeping same for consistency)
    subject: {
      history: '#CD853F', // Peru (Lighter Sienna)
      polity: '#5DADE2', // Lighter SteelBlue
      economy: '#AF7AC5', // Lighter Purple
      geography: '#E59866', // Lighter Pumpkin
      science: '#48C9B0', // Lighter Turquoise
      environment: '#58D68D', // Lighter Green
      currentAffairs: '#F0B27A', // Lighter Carrot
      other: '#BFC9CA', // Lighter Concrete
    }
  },
};

export const shadows = {
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
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
  display: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
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
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};

export const layout = {
  window: { width, height },
  isSmallDevice: width < 375,
};
