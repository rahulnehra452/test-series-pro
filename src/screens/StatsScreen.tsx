import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LineChart, BarChart, StackedBarChart } from 'react-native-chart-kit';
import { useTestStore } from '../stores/testStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getScoreTrend,
  getSubjectAccuracy,
  getDailyStudyHours,
  getSyllabusCoverage,
  getDailyQuestionsStats,
  getWeakTopics
} from '../utils/statHelpers';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

// Premium Chart Config
// Fix: Android doesn't like 'transparent' in some cases, so we explicitly use card color.
const getChartConfig = (colors: any, isDark: boolean) => ({
  backgroundColor: colors.card, // Fix: Use concrete color
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => colors.primary,
  labelColor: (opacity = 1) => colors.textSecondary,
  style: { borderRadius: 16 },
  propsForDots: { r: '3', strokeWidth: '1', stroke: colors.card },
  propsForBackgroundLines: {
    strokeDasharray: '6', // Dashed for cleaner look
    stroke: isDark ? '#2C2C2E' : '#E5E5EA',
    strokeWidth: 1
  },
  fillShadowGradientFrom: colors.primary,
  fillShadowGradientTo: colors.primary,
  fillShadowGradientOpacity: 0.1, // Subtle aesthetic fill
});

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { history, fetchHistory, isFetchingHistory, library, historyError } = useTestStore();
  const [refreshing, setRefreshing] = useState(false);

  // Initial Fetch
  React.useEffect(() => {
    fetchHistory(0);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory(0);
    setRefreshing(false);
  }, [fetchHistory]);

  // ─── Computed Stats ─────────────────────────────────────────────────────────

  const scoreTrend = useMemo(() => getScoreTrend(history), [history]);
  // Use a custom view for Subject Accuracy instead of ChartKit for better control
  const subjectAccuracy = useMemo(() => {
    const { labels, data } = getSubjectAccuracy(history);
    return labels.map((label, idx) => ({ subject: label, accuracy: data[idx] }));
  }, [history]);

  const studyHours = useMemo(() => getDailyStudyHours(history), [history]);
  const syllabusCoverage = useMemo(() => getSyllabusCoverage(history), [history]);
  const dailyQuestions = useMemo(() => getDailyQuestionsStats(history), [history]);
  const weakTopics = useMemo(() => getWeakTopics(history), [history]);

  const baseChartConfig = useMemo(() => getChartConfig(colors, isDark), [colors, isDark]);

  // ─── Render Components ──────────────────────────────────────────────────────

  const SectionTitle = ({ title, icon }: { title: string, icon: any }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  // Fix: Error State
  if (historyError && !history.length && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load statistics</Text>
        <TouchableOpacity onPress={() => fetchHistory(0)} style={styles.retryBtn}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingTop: spacing.md }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Progress</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isFetchingHistory && !history.length && !refreshing ? (
          <View style={{ height: 300, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* ─── PRIMARY DASHBOARD ───────────────────────────────────────────── */}

            {/* 1. Test Score Trend */}
            <Card style={styles.card}>
              <SectionTitle title="Score Trend" icon="trending-up" />
              {scoreTrend && scoreTrend.labels.length > 0 ? (
                <View style={{ overflow: 'hidden', borderRadius: 16 }}>
                  <LineChart
                    data={scoreTrend}
                    width={CHART_WIDTH - spacing.md * 2}
                    height={220}
                    chartConfig={baseChartConfig}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                    yAxisSuffix="%"
                    withInnerLines={true}
                    withOuterLines={false}
                    withVerticalLines={false} // Cleaner look
                    fromZero={true} // Fix: Ensure scale starts at 0 for context
                  />
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Complete more tests to see your trend.</Text>
              )}
              <Text style={[styles.chartCaption, { color: colors.textSecondary }]}>
                Target: consistently above 60%
              </Text>
            </Card>

            {/* 2. Subject-wise Accuracy */}
            <Card style={styles.card}>
              <SectionTitle title="Subject Proficiency" icon="pie-chart" />
              <View style={{ marginTop: 16, gap: 16 }}>
                {subjectAccuracy.map((item, idx) => (
                  <View key={idx}>
                    <View style={styles.accuracyRow}>
                      <Text style={[styles.accuracyLabel, { color: colors.text }]}>{item.subject}</Text>
                      <Text style={[styles.accuracyValue, { color: colors.textSecondary }]}>{item.accuracy}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${item.accuracy}%`,
                            backgroundColor: item.accuracy < 40 ? colors.error :
                              item.accuracy < 70 ? colors.warning : colors.success
                          }
                        ]}
                      />
                    </View>
                  </View>
                ))}
                {subjectAccuracy.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No subject data available.</Text>
                )}
              </View>
            </Card>

            {/* 3. Daily Study Hours */}
            <Card style={styles.card}>
              <SectionTitle title="Study Hours" icon="time" />
              {studyHours.labels.length > 0 ? (
                <View style={{ overflow: 'hidden', borderRadius: 16 }}>
                  <BarChart
                    data={studyHours}
                    width={CHART_WIDTH - spacing.md * 2}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix="h"
                    chartConfig={{
                      ...baseChartConfig,
                      color: (opacity = 1) => colors.warning, // Orange for time
                    }}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                    flatColor={true}
                    showBarTops={false}
                    fromZero={true}
                    showValuesOnTopOfBars={true} // Helpful
                    withInnerLines={false}
                  />
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Start studying to track hours.</Text>
              )}
            </Card>

            {/* ─── SECONDARY TRACKING ─────────────────────────────────────────── */}
            <View style={styles.divider} />

            {/* 4. Syllabus Coverage */}
            <Card style={styles.card}>
              <SectionTitle title="Syllabus Coverage" icon="book" />
              <View style={{ marginTop: 12, gap: 12 }}>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary + '30' }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Attempted</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Revised</Text>
                  </View>
                </View>

                {Object.entries(syllabusCoverage).map(([subject, stats]) => {
                  // Fix: Dynamic Adaptive Goal
                  // Goal increases as you complete more questions: 50 -> 100 -> 150...
                  const GOAL = Math.max(50, Math.ceil((stats.covered + 1) / 50) * 50);

                  const coveredPct = Math.min(100, (stats.covered / GOAL) * 100);
                  const revisedPct = Math.min(100, (stats.revised / GOAL) * 100);

                  if (stats.covered === 0) return null;

                  return (
                    <View key={subject}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={[styles.accuracyLabel, { color: colors.text }]}>{subject}</Text>
                        {/* Show Covered / Goal (Next Level) */}
                        <Text style={[styles.accuracyValue, { color: colors.textSecondary, width: 'auto' }]}>
                          {stats.covered}/{GOAL} Qs
                        </Text>
                      </View>
                      <View style={[styles.progressBarBg, { backgroundColor: colors.border + '40', height: 10 }]}>
                        <View style={[styles.progressBarFill, { width: `${coveredPct}%`, backgroundColor: colors.primary + '30' }]} />
                        <View style={[styles.progressBarFill, { width: `${revisedPct}%`, backgroundColor: colors.primary, position: 'absolute' }]} />
                      </View>
                    </View>
                  );
                })}

                {Object.values(syllabusCoverage).every(s => s.covered === 0) && (
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Attempt questions to track coverage.</Text>
                )}
              </View>
            </Card>

            {/* 5. Questions: Attempted vs Correct */}
            <Card style={styles.card}>
              <SectionTitle title="Attempt Quality" icon="bar-chart" />
              {dailyQuestions.labels.length > 0 ? (
                <View style={{ overflow: 'hidden', borderRadius: 16 }}>
                  <StackedBarChart
                    data={{
                      ...dailyQuestions,
                      barColors: [colors.success, colors.error] // Override with theme colors
                    }}
                    width={CHART_WIDTH - spacing.md * 2}
                    height={220}
                    chartConfig={{
                      ...baseChartConfig,
                      color: (opacity = 1) => colors.text,
                      labelColor: () => colors.textSecondary,
                      propsForBackgroundLines: { strokeWidth: 0 } // Cleaner
                    }}
                    hideLegend={false}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                  />
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No questions recently.</Text>
              )}
            </Card>

            {/* 6. Weak Topics */}
            {weakTopics.length > 0 && (
              <Card style={[styles.card, { borderColor: colors.error + '40', borderWidth: 1 }]}>
                <SectionTitle title="Focus Areas (< 40%)" icon="warning" />
                <View style={{ marginTop: 12 }}>
                  {weakTopics.map((topic, idx) => (
                    <View key={idx} style={styles.weakTopicRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons name="alert-circle" size={16} color={colors.error} />
                        {/* Fix: Text clipping for long subjects */}
                        <Text style={[styles.weakTopicText, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                          {topic.subject}
                        </Text>
                      </View>
                      <Text style={[styles.weakTopicScore, { color: colors.error }]}>{topic.accuracy}%</Text>
                    </View>
                  ))}
                  <Text style={[styles.chartCaption, { marginTop: 12, color: colors.textSecondary }]}>
                    Study these topics before testing again.
                  </Text>
                </View>
              </Card>
            )}

            {/* Recent Tests Link */}
            <TouchableOpacity
              style={[styles.historyLink, { borderColor: colors.border }]}
              onPress={() => navigation.navigate('Main', { screen: 'Library' })}
            >
              <Text style={[styles.historyLinkText, { color: colors.primary }]}>Detailed Test History</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    ...typography.largeTitle,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  groupTitle: {
    ...typography.caption1,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: -8,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...Platform.select<any>({
      ios: shadows.light.sm,
      android: { elevation: 2 }
    })
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    ...typography.headline,
    fontWeight: '700',
  },
  chartCaption: {
    ...typography.caption2,
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.7,
  },
  emptyText: {
    ...typography.callout,
    textAlign: 'center',
    marginVertical: 24,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA', // Theme separate later
    opacity: 0.5,
    marginVertical: 8,
  },
  // Custom Progress Bars
  accuracyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accuracyLabel: {
    ...typography.subhead,
    fontWeight: '600',
  },
  accuracyValue: {
    ...typography.subhead,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  // Weak Topics
  weakTopicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  weakTopicText: {
    ...typography.body,
    fontWeight: '500',
  },
  weakTopicScore: {
    ...typography.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // Legend
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption1,
    fontWeight: '500',
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    borderStyle: 'dashed',
    marginBottom: 20
  },
  historyLinkText: {
    ...typography.subhead,
    fontWeight: '600',
    marginRight: 4,
  },
  // Error state
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  errorText: {
    ...typography.body,
    fontWeight: '500',
  },
  retryBtn: {
    marginTop: 8,
    padding: 12,
  }
});
