import { Alert, Platform } from 'react-native';

/**
 * Standardized error handling for the app.
 * Replaces ad-hoc console.error and Alert.alert calls.
 */
export const handleError = (error: unknown, context?: string) => {
  const message = error instanceof Error ? error.message : String(error);

  if (__DEV__) {
    console.error(`[Error] ${context ? `[${context}] ` : ''}${message}`, error);
  }

  // Optional: In production, send to Sentry/Crashlytics here

  return message;
};

export const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};
