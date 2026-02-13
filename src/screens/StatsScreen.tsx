import React from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { useTestStore } from '../stores/testStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const StatCard = ({ label, value, icon, color }: { label: string, value: string, icon: any, color: string }) => {
  const { colors, isDark } = useTheme();
  return (
    <Card style={[styles.statCard, { backgroundColor: isDark ? colors.card : colors.background, borderColor: isDark ? colors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
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
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { history, isLoadingMoreHistory, hasMoreHistory, fetchHistory, historyPage } = useTestStore();
  const [showAllHistory, setShowAllHistory] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null); // null = All
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  React.useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  const availableYears = React.useMemo(() => {
    const years = new Set(history.map(h => new Date(h.startTime).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  const filteredHistory = React.useMemo(() => {
    return history.filter(h => {
      if (h.status !== 'Completed') return false;
      const date = new Date(h.startTime);
      const matchesYear = date.getFullYear() === selectedYear;
      const matchesMonth = selectedMonth === null || date.getMonth() === selectedMonth;
      return matchesYear && matchesMonth;
    });
  }, [history, selectedMonth, selectedYear]);

  const displayedHistory = showAllHistory ? filteredHistory : filteredHistory.slice(0, 5);

  const stats = React.useMemo(() => {
    const totalTests = filteredHistory.length;
    const avgScore = totalTests > 0
      ? (filteredHistory.reduce((acc, curr) => acc + curr.score, 0) / totalTests).toFixed(1)
      : '0';

    const uniqueDays = new Set(filteredHistory.map(h => new Date(h.startTime).toDateString())).size;
    const totalTimeMs = filteredHistory.reduce((acc, curr) => acc + (curr.endTime || 0) - curr.startTime, 0);
    const totalHours = (totalTimeMs / (1000 * 60 * 60)).toFixed(1);

    return [
      { label: 'Total Tests', value: String(totalTests), icon: 'clipboard-outline', color: '#007AFF' },
      { label: 'Avg Score', value: `${avgScore}`, icon: 'ribbon-outline', color: '#34C759' },
      { label: 'Time Spent', value: `${totalHours}h`, icon: 'time-outline', color: '#FF9500' },
      { label: 'Streak', value: `${uniqueDays} Days`, icon: 'flame-outline', color: '#FF3B30' },
    ];
  }, [filteredHistory]);

  const chartData = React.useMemo(() => {
    const sortedFiltered = [...filteredHistory].sort((a, b) => a.startTime - b.startTime);

    if (sortedFiltered.length === 0) return null;

    // 1. Group contributions by day
    const dailyTotals = new Map<string, number>();
    sortedFiltered.forEach(h => {
      const date = new Date(h.startTime);
      const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const answeredCount = Object.values(h.answers).filter(a => a !== undefined && a !== null).length;
      dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + answeredCount);
    });

    // 2. Map back to sorted array and calculate running total
    const sortedDayKeys = Array.from(dailyTotals.keys()).sort((a, b) => {
      const [y1, m1, d1] = a.split('-').map(Number);
      const [y2, m2, d2] = b.split('-').map(Number);
      return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
    });

    let runningTotal = 0;
    const cumulativeData = sortedDayKeys.map(key => {
      runningTotal += dailyTotals.get(key)!;
      const [y, m, d] = key.split('-').map(Number);
      return { total: runningTotal, label: `${d}/${m}` };
    });

    // 3. Show last 7 data points
    const recentData = cumulativeData.slice(-7);

    return {
      labels: recentData.map(d => d.label),
      datasets: [{
        data: recentData.map(d => d.total)
      }]
    };
  }, [filteredHistory]);

  const renderHistoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => navigation.navigate('Results', { attemptId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={[styles.historyCard, { backgroundColor: colors.card }]}>
        <View style={styles.historyRow}>
          <View style={styles.historyInfo}>
            <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
              {item.testTitle || 'Practice Test'}
            </Text>
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
              {new Date(item.startTime).toLocaleDateString()} • {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.scoreContainer}>
            <View style={[styles.scoreBadge, { backgroundColor: colors.secondaryBackground }]}>
              <Text style={[styles.scoreText, { color: colors.text }]}>
                {item.score}/{item.totalMarks}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 8 }} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={displayedHistory}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Statistics</Text>
            </View>

            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={styles.monthScrollContent}>
                <TouchableOpacity
                  style={[styles.monthChip, selectedMonth === null && { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedMonth(null)}
                >
                  <Text style={[styles.monthText, { color: selectedMonth === null ? '#fff' : colors.textSecondary }]}>All</Text>
                </TouchableOpacity>
                {MONTHS.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthChip, selectedMonth === index && { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedMonth(index)}
                  >
                    <Text style={[styles.monthText, { color: selectedMonth === index ? '#fff' : colors.textSecondary }]}>{month}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll} contentContainerStyle={styles.yearScrollContent}>
                {availableYears.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearChip, { borderColor: colors.border }, selectedYear === year && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[styles.yearText, { color: selectedYear === year ? '#fff' : colors.text }]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.gridContainer}>
              {stats.map((stat, index) => (
                <View key={index} style={styles.gridItem}>
                  <StatCard {...stat} />
                </View>
              ))}
            </View>

            <View style={styles.chartSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Total Questions Solved</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                {chartData ? (
                  <LineChart
                    data={chartData}
                    width={Dimensions.get("window").width - spacing.lg * 2}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: colors.card,
                      backgroundGradientFrom: colors.card,
                      backgroundGradientTo: colors.card,
                      decimalPlaces: 0,
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

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Test History</Text>
              {history.length > 5 && (
                <TouchableOpacity onPress={() => setShowAllHistory(!showAllHistory)}>
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>
                    {showAllHistory ? 'Show Less' : `View All (${history.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.noHistoryText, { color: colors.textSecondary }]}>
            No tests taken yet. Start a test to see history!
          </Text>
        }
        ListFooterComponent={
          <View style={{ paddingBottom: 100 }}>
            {showAllHistory && hasMoreHistory && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => fetchHistory(historyPage + 1)}
                disabled={isLoadingMoreHistory}
              >
                {isLoadingMoreHistory ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
            {!hasMoreHistory && showAllHistory && history.length > 0 && (
              <Text style={[styles.noHistoryText, { color: colors.textSecondary, marginTop: 20 }]}>No more history</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    marginTop: 4,
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
    gap: spacing.md,
  },
  historyCard: {
    padding: spacing.md,
    // Add shadow if needed, Card component handles it usually
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  historyTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    ...typography.caption2,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  scoreText: {
    ...typography.caption1,
    fontWeight: '700',
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
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  monthScroll: {
    marginBottom: spacing.xs,
  },
  monthScrollContent: {
    paddingRight: spacing.lg,
    gap: 8,
  },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(120, 120, 128, 0.12)',
  },
  monthText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  yearScroll: {},
  yearScrollContent: {
    paddingRight: spacing.lg,
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  yearText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  loadMoreButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  loadMoreText: {
    ...typography.body,
    fontWeight: '600',
  },
});
