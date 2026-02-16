import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

interface ConfigErrorScreenProps {
  missingVariables: string[];
}

export const ConfigErrorScreen = ({ missingVariables }: ConfigErrorScreenProps) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Configuration Error</Text>
        <Text style={styles.message}>
          App startup was blocked because required environment variables are missing.
        </Text>
        <Text style={styles.listTitle}>Missing variables:</Text>
        {missingVariables.map(variable => (
          <Text key={variable} style={styles.listItem}>
            - {variable}
          </Text>
        ))}
        <Text style={styles.hint}>
          Add these values to your `.env` file and restart the app.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#1F2937',
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  message: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22,
  },
  listTitle: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  listItem: {
    color: '#FCA5A5',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Courier',
  },
  hint: {
    marginTop: 16,
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
  },
});
