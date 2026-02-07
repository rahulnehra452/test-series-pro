import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../constants/theme';

// Components
import { StreakCard } from '../components/home/StreakCard';
import { ProgressGrid } from '../components/home/ProgressGrid';
import { ContinueLearning } from '../components/home/ContinueLearning';

// Types
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock Data
const MOCK_USER = {
  name: 'Student',
  streak: 0,
};

const MOCK_PROGESS = {
  title: 'UPSC Prelims 2024',
  progress: 0,
  totalTests: 30,
  completedTests: 0,
};

const MOCK_RECENT_ACTIVITY = [
  { id: '1', title: 'Ancient History Test 1', score: '60%', date: '2 days ago' },
  { id: '2', title: 'Polity Mock 3', score: 'Incomplete', date: '3 days ago' },
];

// ... types and previous imports
import { useAuthStore } from '../stores/authStore';
import { useTestStore } from '../stores/testStore';

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [greeting, setGreeting] = useState(getTimeBasedGreeting());
  const { history } = useTestStore();
  const { user, checkStreak } = useAuthStore();

  React.useEffect(() => {
    checkStreak();
    // Refresh streak on mount
  }, []);

  const recentActivity = history.slice(0, 3); // Get last 3 attempts

  function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  const handleContinue = () => {
    // Navigate to specific test or series
    navigation.navigate('Main', { screen: 'Tests' } as any);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + spacing.md }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {greeting} 👋
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || 'Student'}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.avatarText}>{user?.name?.[0] || 'S'}</Text>
        </View>
      </View>

      {/* Streak Card */}
      <StreakCard days={user?.streak || 0} style={styles.streakCard} />

      {/* Progress Grid */}
      <ProgressGrid />

      {/* Continue Learning */}
      <ContinueLearning
        title={MOCK_PROGESS.title}
        progress={MOCK_PROGESS.progress}
        totalTests={MOCK_PROGESS.totalTests}
        completedTests={MOCK_PROGESS.completedTests}
        onPress={handleContinue}
      />

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Stats' } as any)}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Activity List */}
      <View style={styles.activityList}>
        {recentActivity.length > 0 ? (
          recentActivity.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.activityItem, { backgroundColor: colors.secondaryBackground }]}
              onPress={() => {
                navigation.navigate('Results', { attemptId: item.id });
              }}
            >
              <View>
                <Text style={[styles.activityTitle, { color: colors.text }]}>{item.testTitle}</Text>
                <Text style={[styles.activityDate, { color: colors.textTertiary }]}>
                  {new Date(item.startTime).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[
                styles.activityScore,
                { color: item.status === 'Completed' ? colors.success : colors.warning }
              ]}>
                {item.score}/{item.totalMarks}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.activityItem, { backgroundColor: colors.secondaryBackground }]}>
            <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
              No recent activity
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Padding */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.subhead,
    marginBottom: 4,
  },
  userName: {
    ...typography.title1,
    fontSize: 28,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.title3,
    color: '#FFFFFF',
  },
  streakCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title3,
  },
  seeAll: {
    ...typography.subhead,
    fontWeight: '600',
  },
  activityList: {
    gap: spacing.sm,
  },
  activityItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDate: {
    ...typography.caption1,
  },
  activityScore: {
    ...typography.callout,
    fontWeight: '700',
  },
});
