import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../constants/theme';

// Components
import { StreakCard } from '../components/home/StreakCard';
import { ProgressGrid } from '../components/home/ProgressGrid';
import { ContinueLearning } from '../components/home/ContinueLearning';
import { SkeletonActivityCard } from '../components/home/SkeletonActivityCard';
import * as Haptics from 'expo-haptics';

// Types
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MOCK_PROGESS = {
  title: 'UPSC Prelims 2024',
  progress: 0,
  totalTests: 30,
  completedTests: 0,
};

// ... types and previous imports
import { useAuthStore } from '../stores/authStore';
import { useTestStore } from '../stores/testStore';
// import { useInAppUpdates } from '../hooks/useInAppUpdates';

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // useInAppUpdates(); // Requires expo-updates
  const navigation = useNavigation<NavigationProp>();
  const [greeting, setGreeting] = useState(getTimeBasedGreeting());
  const { history, fetchHistory, isFetchingHistory } = useTestStore();
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const isInitialLoading = history.length === 0 && isFetchingHistory;

  const getRelativeDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await fetchHistory(0);
    setIsRefreshing(false);
  }, [fetchHistory]);

  useEffect(() => {
    const timer = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const recentActivity = [...history]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 5);

  function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Find latest in-progress test
  const currentAttempt = history
    .filter(h => h.status === 'In Progress')
    .sort((a, b) => b.startTime - a.startTime)[0];

  const handleContinue = () => {
    if (currentAttempt) {
      navigation.navigate('TestInterface', {
        testId: currentAttempt.testId,
        testTitle: currentAttempt.testTitle
      });
    } else {
      // Navigate to Tests screen
      navigation.navigate('Main', { screen: 'Tests' });
    }
  };

  const handleActivityPress = (attempt: (typeof recentActivity)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (attempt.status === 'In Progress') {
      navigation.navigate('TestInterface', {
        testId: attempt.testId,
        testTitle: attempt.testTitle,
      });
      return;
    }

    navigation.navigate('Results', { attemptId: attempt.id });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + spacing.md }
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
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
        <TouchableOpacity
          style={[styles.subscriptionButton, { backgroundColor: colors.warning + '20' }]}
          onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
        >
          <Ionicons name="diamond" size={20} color={colors.warning} />
          <Text style={[styles.subscriptionText, { color: colors.warning }]}>Pro</Text>
        </TouchableOpacity>
      </View>

      {/* Streak Card */}
      <StreakCard days={user?.streak || 0} style={styles.streakCard} />

      {/* Progress Grid */}
      <ProgressGrid />

      {/* Continue Learning */}
      <ContinueLearning
        title={currentAttempt ? currentAttempt.testTitle : MOCK_PROGESS.title}
        subtitle={currentAttempt
          ? `Question ${(currentAttempt.currentIndex || 0) + 1} of ${currentAttempt.questions.length || '?'} • Resume`
          : `${MOCK_PROGESS.completedTests} of ${MOCK_PROGESS.totalTests} tests completed`}
        progress={currentAttempt
          ? ((currentAttempt.currentIndex || 0) / (currentAttempt.questions.length || 1))
          : MOCK_PROGESS.progress}
        buttonText={currentAttempt ? "Resume Test" : "Continue Series"}
        onPress={handleContinue}
      />

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Progress' })}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Activity List */}
      <View style={styles.activityList}>
        {isInitialLoading ? (
          // Show Skeletons
          [1, 2, 3].map(i => <SkeletonActivityCard key={i} />)
        ) : recentActivity.length > 0 ? (
          recentActivity.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.activityItem, { backgroundColor: colors.secondaryBackground }]}
              onPress={() => handleActivityPress(item)}
            >
              <View>
                <Text style={[styles.activityTitle, { color: colors.text }]}>{item.testTitle}</Text>
                <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                  {getRelativeDate(item.startTime)}
                </Text>
              </View>
              <Text style={[
                styles.activityScore,
                {
                  // Guard totalMarks=0 rows to avoid NaN/Infinity color decisions.
                  color:
                    item.status !== 'Completed'
                      ? colors.textTertiary
                      : item.totalMarks > 0 && (item.score / item.totalMarks) >= 0.6
                        ? colors.success
                        : item.totalMarks > 0 && (item.score / item.totalMarks) >= 0.2
                          ? colors.warning
                          : colors.error
                }
              ]}>
                {item.status === 'Completed' ? `${item.score}/${item.totalMarks}` : 'In Progress'}
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
    marginBottom: 0,
  },
  userName: {
    ...typography.title1,
    fontSize: 28,
    marginTop: -4,
    lineHeight: 34,
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  subscriptionText: {
    ...typography.subhead,
    fontWeight: '700',
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
