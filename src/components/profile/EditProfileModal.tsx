import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { spacing, typography, borderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { user, updateProfile } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [visible, user]);

  const isValidName = name.trim().length >= 2;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValid = isValidName && isValidEmail;

  const handleSave = async () => {
    if (!isValid) return;

    setIsLoading(true);
    try {
      await updateProfile({ name, email });
      onClose();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Could not save profile changes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.form}>
              <View style={styles.avatarSection}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {(name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                  Profile photo from your account
                </Text>
              </View>

              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                leftIcon="person-outline"
                containerStyle={{ marginBottom: spacing.md }}
              />

              <View style={{ opacity: 0.7 }}>
                <Input
                  label="Email"
                  value={email}
                  editable={false}
                  placeholder="Enter your email"
                  leftIcon="mail-outline"
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={isLoading}
                disabled={!isValid}
                fullWidth
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    maxHeight: '90%',
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
    padding: 4,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    ...typography.title1,
    color: '#FFF',
    fontWeight: '700',
  },
  readOnlyText: {
    ...typography.caption1,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
