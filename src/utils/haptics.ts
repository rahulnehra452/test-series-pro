import * as Haptics from 'expo-haptics';

// Safe wrapper for Haptics to prevent crashes if module is missing or fails
export const safeHaptics = {
  selectionAsync: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      // Ignore error
    }
  },
  impactAsync: async (style: Haptics.ImpactFeedbackStyle) => {
    try {
      await Haptics.impactAsync(style);
    } catch (e) {
      // Ignore error
    }
  },
  notificationAsync: async (type: Haptics.NotificationFeedbackType) => {
    try {
      await Haptics.notificationAsync(type);
    } catch (e) {
      // Ignore error
    }
  },
  ImpactFeedbackStyle: Haptics.ImpactFeedbackStyle,
  NotificationFeedbackType: Haptics.NotificationFeedbackType,
};
