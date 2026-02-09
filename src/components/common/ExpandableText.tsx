import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { typography } from '../../constants/theme';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface ExpandableTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  maxLines?: number;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  style,
  maxLines = 3
}) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(true);

  useEffect(() => {
    // Reset measurement when text changes
    setIsMeasuring(true);
    setShouldShowButton(false);
    setIsExpanded(false);
  }, [text]);

  const onTextLayout = useCallback((e: any) => {
    if (isMeasuring) {
      if (e.nativeEvent.lines.length > maxLines) {
        setShouldShowButton(true);
      }
      setIsMeasuring(false);
    }
  }, [maxLines, isMeasuring]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View>
      <Text
        style={[style, { opacity: isMeasuring ? 0 : 1 }]}
        numberOfLines={isMeasuring || isExpanded ? undefined : maxLines}
        onTextLayout={onTextLayout}
      >
        {text}
      </Text>
      {shouldShowButton && !isMeasuring && (
        <TouchableOpacity onPress={toggleExpand} style={styles.button}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            {isExpanded ? 'Show Less' : 'Read More'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  buttonText: {
    ...typography.caption1, // ~12px
    fontWeight: '700',
  },
});
