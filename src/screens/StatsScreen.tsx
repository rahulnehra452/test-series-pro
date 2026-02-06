import React from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { useTestStore } from '../stores/testStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Ionicons } from '@expo/vector-icons';

// Mock Data
const OVERVIEW_STATS = [
  { label: 'Total Tests', value: '12', icon: 'clipboard-outline', color: '#007AFF' },
  { label: 'Avg Score', value: '68%', icon: 'ribbon-outline', color: '#34C759' },
  { label: 'Time Spent', value: '8.5h', icon: 'time-outline', color: '#FF9500' },
  { label: 'Streak', value: '4 Days', icon: 'flame-outline', color: '#FF3B30' },
];

const MOCK_HISTORY = [
  { id: '1', title: 'UPSC Prelims Mock 1', score: '112/200', date: 'Yesterday' },
  { id: '2', title: 'Indian Polity Test', score: '85/100', date: '2 days ago' },
  { id: '3', title: 'Modern History Quiz', score: '40/50', date: '4 days ago' },
];

const StatCard = ({ label, value, icon, color }: { label: string, value: string, icon: any, color: string }) => {
  const { colors } = useTheme();
  return (
    <Card style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </Card>
  );
};

export default function StatsScreen() {
  const { colors } = useTheme();
  const { history } = useTestStore();

  // Dynamic Stats Calculation
  const stats = React.useMemo(() => {
    const totalTests = history.length;
    const avgScore = totalTests > 0
      ? (history.reduce((acc, curr) => acc + curr.score, 0) / totalTests).toFixed(1)
      : '0';

    // Simple streak logic: sequential days with tests (simplified for MVP)
    const uniqueDays = new Set(history.map(h => new Date(h.startTime).toDateString())).size;

    // Total duration in hours
    const totalTimeMs = history.reduce((acc, curr) => acc + (curr.endTime || 0) - curr.startTime, 0);
    const totalHours = (totalTimeMs / (1000 * 60 * 60)).toFixed(1);

    return [
      { label: 'Total Tests', value: String(totalTests), icon: 'clipboard-outline', color: '#007AFF' },
      { label: 'Avg Score', value: `${avgScore}`, icon: 'ribbon-outline', color: '#34C759' },
      { label: 'Time Spent', value: `${totalHours}h`, icon: 'time-outline', color: '#FF9500' },
      { label: 'Streak', value: `${uniqueDays} Days`, icon: 'flame-outline', color: '#FF3B30' },
    ];
  }, [history]);

  // Chart Data
  const chartData = React.useMemo(() => {
    const recentHistory = history.slice(0, 6).reverse(); // Last 6 tests
    if (recentHistory.length === 0) return null;

    return {
      labels: recentHistory.map((_, i) => `T${i + 1}`),
      datasets: [{
        data: recentHistory.map(h => h.score)
      }]
    };
  }, [history]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Statistics</Text>
      </View>

      <View style={styles.gridContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.gridItem}>
            <StatCard {...stat} />
          </View>
        ))}
      </View>

      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Trend</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
          {chartData ? (
            <LineChart
              data={chartData}
              width={Dimensions.get("window").width - spacing.lg * 2}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.background,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 1,
                color: (opacity = 1) => colors.primary,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: { borderRadius: borderRadius.lg },
                propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: borderRadius.lg }}
            />
          ) : (
            <View style={[styles.emptyChart, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.textSecondary }}>No test data available yet</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Test History</Text>
        <View style={styles.historyList}>
          {history.length > 0 ? (
            history.map((item) => (
              <Card key={item.id} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>Test Attempt</Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                      {new Date(item.startTime).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{item.score}/{item.totalMarks}</Text>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Text style={[styles.noHistoryText, { color: colors.textSecondary }]}>
              No tests taken yet. Start a test to see history!
            </Text>
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.largeTitle,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: '47%',
  },
  statCard: {
    padding: spacing.md,
    height: 110,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...typography.title3,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption1,
  },
  chartSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.title3,
    marginBottom: spacing.md,
  },
  chartScroll: {
    overflow: 'visible',
  },
  section: {
    marginBottom: spacing.lg,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  historyTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    ...typography.caption2,
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  scoreText: {
    ...typography.callout,
    fontWeight: '700',
  },
  historyList: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  historyCard: {
    padding: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    ...typography.caption1,
  },
  emptyChart: {
    width: Dimensions.get("window").width - spacing.lg * 2,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  noHistoryText: {
    textAlign: 'center',
    marginTop: spacing.md,
    ...typography.body,
  }
});
