import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import { Question } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

interface QuestionPaletteProps {
  isVisible: boolean;
  onClose: () => void;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>;
  marked: Record<string, boolean>;
  onJumpToQuestion: (index: number) => void;
}

export const QuestionPalette = ({
  isVisible,
  onClose,
  questions,
  currentIndex,
  answers,
  marked,
  onJumpToQuestion
}: QuestionPaletteProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const getStatusColor = (index: number, id: string) => {
    if (currentIndex === index) return { bg: 'transparent', border: colors.primary, text: colors.primary };
    if (marked[id]) return { bg: colors.warning + '20', border: colors.warning, text: colors.warning };
    if (answers[id] !== undefined && answers[id] !== null) return { bg: colors.success + '20', border: 'transparent', text: colors.success };
    return { bg: colors.secondaryBackground, border: 'transparent', text: colors.text };
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.container, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Question Palette</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.secondaryBackground }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Answered</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Marked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.secondaryBackground, borderWidth: 1, borderColor: colors.border }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Unvisited</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing.lg }}>
            <FlatList
              data={questions}
              keyExtractor={(item, index) => item.id || index.toString()}
              numColumns={6}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              columnWrapperStyle={{ gap: 12, justifyContent: 'center' }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const status = getStatusColor(index, item.id);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onJumpToQuestion(index);
                      onClose();
                    }}
                    style={[
                      styles.gridItem,
                      {
                        backgroundColor: status.bg,
                        borderColor: status.border,
                        borderWidth: 1.5
                      }
                    ]}
                  >
                    <Text style={[styles.gridText, { color: status.text }]}>{index + 1}</Text>
                    {marked[item.id] && (
                      <View style={[styles.badge, { backgroundColor: colors.warning }]} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title3,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
    borderRadius: borderRadius.full,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  gridItem: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridText: {
    ...typography.body,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFF',
  },
});
