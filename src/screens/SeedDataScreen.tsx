
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { MOCK_TEST_SERIES } from './TestsScreen';
import { useTheme } from '../contexts/ThemeContext';

export default function SeedDataScreen() {
  const { colors } = useTheme();
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const seedTests = async () => {
    addLog('Starting Seed...');

    for (const test of MOCK_TEST_SERIES) {
      addLog(`Uploading: ${test.title}`);

      // Check if exists
      const { data: existing } = await supabase
        .from('tests')
        .select('id')
        .eq('title', test.title)
        .single();

      if (existing) {
        addLog(`Skipped (Exists): ${test.title}`);
        continue;
      }

      const { error } = await supabase.from('tests').insert({
        title: test.title,
        description: test.description,
        category: test.category,
        difficulty: test.difficulty,
        total_tests: test.totalTests,
        total_questions: test.totalQuestions,
        duration_minutes: test.duration,
        price: test.price ? parseFloat(test.price.replace('₹', '')) : 0,
        // cover_image_url: '...' 
      });

      if (error) {
        addLog(`Error: ${error.message}`);
      } else {
        addLog(`Success: ${test.title}`);
      }
    }
    addLog('Done!');
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
      <Text style={{ color: colors.text, fontSize: 24, marginBottom: 20 }}>Admin Seeder</Text>

      <TouchableOpacity
        onPress={seedTests}
        style={{ padding: 15, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Upload Mock Tests to Cloud</Text>
      </TouchableOpacity>

      <ScrollView style={{ marginTop: 20, flex: 1, backgroundColor: colors.card, padding: 10, borderRadius: 8 }}>
        {log.map((l, i) => (
          <Text key={i} style={{ color: colors.text, marginBottom: 5, fontFamily: 'monospace' }}>{l}</Text>
        ))}
      </ScrollView>
    </View>
  );
}
