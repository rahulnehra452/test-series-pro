import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  // Which edges to apply safe area padding to. Default: ['top']
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  // Optional status bar style override
  statusBarStyle?: 'light-content' | 'dark-content' | 'auto';
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  safeAreaEdges = ['top'],
  backgroundColor,
  statusBarStyle,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const paddingStyle = {
    paddingTop: safeAreaEdges.includes('top') ? insets.top : 0,
    paddingBottom: safeAreaEdges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: safeAreaEdges.includes('left') ? insets.left : 0,
    paddingRight: safeAreaEdges.includes('right') ? insets.right : 0,
  };

  const defaultBarStyle = isDark ? 'light-content' : 'dark-content';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: backgroundColor || colors.background },
        paddingStyle,
        style,
      ]}
    >
      <StatusBar
        barStyle={statusBarStyle === 'auto' ? defaultBarStyle : (statusBarStyle || defaultBarStyle)}
        backgroundColor={backgroundColor || colors.background}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
