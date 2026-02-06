import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing } from '../../constants/theme';

interface QuestionDisplayProps {
  question: {
    id: string;
    text: string;
    // image?: string
  };
  questionNumber: number;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, questionNumber }) => {
  const { colors } = useTheme();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.questionText, { color: colors.text }]}>
        <Text style={{ fontWeight: '700' }}>Q{questionNumber}. </Text>
        {question.text}
      </Text>
      {/* Image placeholder would go here */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  content: {
    paddingVertical: spacing.lg,
  },
  questionText: {
    ...typography.title3, // ~20px
    lineHeight: 28,
  },
});
