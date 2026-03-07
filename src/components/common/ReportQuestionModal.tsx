import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';

interface ReportQuestionModalProps {
  visible: boolean;
  onClose: () => void;
  questionId: string | null;
}

const REPORT_REASONS = [
  "Incorrect Answer",
  "Typo / Grammar error",
  "Question is unclear",
  "Off-topic / Out of syllabus",
  "Other"
];

export const ReportQuestionModal: React.FC<ReportQuestionModalProps> = ({
  visible,
  onClose,
  questionId,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const showToast = useToastStore(state => state.showToast);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      showToast('Please select a reason', 'error');
      return;
    }

    if (!questionId) {
      showToast('No question selected', 'error');
      return;
    }

    if (!user?.id) {
      showToast('You must be logged in to report', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reported_questions')
        .insert({
          question_id: questionId,
          user_id: user.id,
          reason: selectedReason,
          details: details.trim(),
          status: 'pending'
        });

      if (error) {
        console.error("Report submission error:", error);
        // Sometimes RLS blocks this if policies aren't set up yet, we will check this
        showToast('Failed to submit report', 'error');
      } else {
        showToast('Report submitted successfully', 'success');
        handleClose();
      }
    } catch (err) {
      console.error(err);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Report Question</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Why are you reporting this question? *
            </Text>

            <View style={styles.reasonsContainer}>
              {REPORT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary + '15'
                          : (isDark ? 'rgba(255,255,255,0.05)' : colors.secondaryBackground),
                        borderColor: isSelected
                          ? colors.primary
                          : (isDark ? 'rgba(255,255,255,0.1)' : colors.border)
                      }
                    ]}
                    onPress={() => setSelectedReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                      styles.reasonText,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? '600' : '400'
                      }
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Additional Details (Optional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.background,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                  color: colors.text
                }
              ]}
              placeholder="Provide more context..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={details}
              onChangeText={setDetails}
              textAlignVertical="top"
            />

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                {
                  backgroundColor: selectedReason ? colors.primary : colors.border,
                  opacity: isSubmitting ? 0.7 : 1
                }
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.title3,
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.subhead,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  reasonsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 12,
  },
  reasonText: {
    ...typography.body,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 120,
    ...typography.body,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    // Background dynamic based on state
  },
  buttonText: {
    ...typography.headline,
  },
});
