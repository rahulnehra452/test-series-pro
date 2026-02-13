import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTestStore } from '../stores/testStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../constants/theme';
import { Card } from '../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TestAttempt } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

type SortOption = 'recent' | 'score_high' | 'score_low' | 'duration';

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: 'recent', label: 'Most Recent', icon: 'time-outline' },
  { key: 'score_high', label: 'Highest Score', icon: 'trending-up-outline' },
  { key: 'score_low', label: 'Lowest Score', icon: 'trending-down-outline' },
  { key: 'duration', label: 'Longest Duration', icon: 'hourglass-outline' },
];

const getScoreColor = (score: number, total: number): string => {
  if (total <= 0) return '#8E8E93';
  const pct = (score / total) * 100;
  if (pct >= 70) return '#48A87C';  // muted green
  if (pct >= 40) return '#C4913E';  // muted amber
  return '#B85C5C';                 // muted red
};

const getScorePercent = (score: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((score / total) * 100);
};

const getRelativeDate = (timestamp: number): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDateGroupKey = (timestamp: number): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'This Month';
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const formatDuration = (startTime: number, endTime?: number): string => {
  if (!endTime) return '—';
  const ms = endTime - startTime;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
};

// getSubjectFromAttempt removed — using exam/test series info instead

const groupHistoryByDate = (items: TestAttempt[]): { title: string; data: TestAttempt[] }[] => {
  const groups = new Map<string, TestAttempt[]>();
  items.forEach(item => {
    const key = getDateGroupKey(item.startTime);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });
  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
};

// ─── StatCard ──────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={[
      styles.statCard,
      {
        backgroundColor: isDark ? colors.card : colors.background,
        ...(isDark ? shadows.dark.sm : shadows.light.sm),
        borderColor: isDark ? colors.border : '#F0F0F5',
        borderWidth: 1,
      },
    ]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { history, tests, isLoadingMoreHistory, hasMoreHistory, fetchHistory, fetchTests, historyPage } = useTestStore();

  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortOption>('recent');
  const [showSortOptions, setShowSortOptions] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  React.useEffect(() => {
    fetchTests(false);
    fetchHistory(0);
  }, [fetchHistory, fetchTests]);

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await fetchHistory(0);
    setIsRefreshing(false);
  }, [fetchHistory]);

  const availableYears = React.useMemo(() => {
    const years = new Set(history.map(h => new Date(h.startTime).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  // ── Filtering & Sorting ──────────────────────────────────────────────────
  const filteredHistory = React.useMemo(() => {
    let filtered = history.filter(h => {
      if (h.status !== 'Completed') return false;
      const date = new Date(h.startTime);
      const matchesYear = date.getFullYear() === selectedYear;
      const matchesMonth = selectedMonth === null || date.getMonth() === selectedMonth;
      return matchesYear && matchesMonth;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(h => {
        const title = (h.testTitle || '').toLowerCase();
        const matched = tests.find(t => t.id === h.testId);
        const exam = (matched?.category || '').toLowerCase();
        const series = (matched?.title || '').toLowerCase();
        return title.includes(q) || exam.includes(q) || series.includes(q) || h.testId.toLowerCase().includes(q);
      });
    }

    switch (sortBy) {
      case 'score_high':
        filtered.sort((a, b) => {
          const pctA = a.totalMarks > 0 ? a.score / a.totalMarks : 0;
          const pctB = b.totalMarks > 0 ? b.score / b.totalMarks : 0;
          return pctB - pctA;
        });
        break;
      case 'score_low':
        filtered.sort((a, b) => {
          const pctA = a.totalMarks > 0 ? a.score / a.totalMarks : 0;
          const pctB = b.totalMarks > 0 ? b.score / b.totalMarks : 0;
          return pctA - pctB;
        });
        break;
      case 'duration':
        filtered.sort((a, b) => {
          const durA = (a.endTime || a.startTime) - a.startTime;
          const durB = (b.endTime || b.startTime) - b.startTime;
          return durB - durA;
        });
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => b.startTime - a.startTime);
        break;
    }

    return filtered;
  }, [history, selectedMonth, selectedYear, searchQuery, sortBy]);

  const sections = React.useMemo(() => groupHistoryByDate(filteredHistory), [filteredHistory]);

  // ── Stats Summary ────────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    const total = filteredHistory.length;
    const avgScore =
      total > 0
        ? (filteredHistory.reduce((acc, curr) => {
          if (curr.totalMarks <= 0) return acc;
          return acc + (curr.score / curr.totalMarks) * 100;
        }, 0) / total).toFixed(0)
        : '0';

    const uniqueDays = new Set(filteredHistory.map(h => new Date(h.startTime).toDateString())).size;
    const totalTimeMs = filteredHistory.reduce((acc, curr) => acc + ((curr.endTime || 0) - curr.startTime), 0);
    const totalHours = (totalTimeMs / (1000 * 60 * 60)).toFixed(1);

    return [
      { label: 'Tests Taken', value: String(total), icon: 'clipboard-outline', color: '#007AFF' },
      { label: 'Avg Score', value: `${avgScore}%`, icon: 'ribbon-outline', color: '#34C759' },
      { label: 'Study Time', value: `${totalHours}h`, icon: 'time-outline', color: '#FF9500' },
      { label: 'Active Days', value: `${uniqueDays}`, icon: 'flame-outline', color: '#FF3B30' },
    ];
  }, [filteredHistory]);

  // ── Chart Data ───────────────────────────────────────────────────────────
  const chartData = React.useMemo(() => {
    const sorted = [...filteredHistory].sort((a, b) => a.startTime - b.startTime);
    if (sorted.length === 0) return null;

    const dailyTotals = new Map<string, number>();
    sorted.forEach(h => {
      const date = new Date(h.startTime);
      const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const answered = Object.values(h.answers).filter(a => a !== undefined && a !== null).length;
      dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + answered);
    });

    const sortedKeys = Array.from(dailyTotals.keys()).sort((a, b) => {
      const [y1, m1, d1] = a.split('-').map(Number);
      const [y2, m2, d2] = b.split('-').map(Number);
      return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
    });

    let running = 0;
    const cumulative = sortedKeys.map(key => {
      running += dailyTotals.get(key)!;
      const [, m, d] = key.split('-').map(Number);
      return { total: running, label: `${d}/${m}` };
    });

    const recent = cumulative.slice(-7);
    return {
      labels: recent.map(d => d.label),
      datasets: [{ data: recent.map(d => d.total) }],
    };
  }, [filteredHistory]);

  // ── Render History Card ──────────────────────────────────────────────────
  const renderHistoryItem = ({ item }: { item: TestAttempt }) => {
    const pct = getScorePercent(item.score, item.totalMarks);
    const scoreColor = getScoreColor(item.score, item.totalMarks);
    // Extract exam name from slug-based testId
    const UPPER_EXAMS = new Set(['ssc', 'cgl', 'upsc', 'rrb', 'ntpc', 'sbi', 'po', 'ias', 'nda', 'ibps', 'lic', 'cat', 'mba', 'pre', 'mains', 'mpsc', 'bpsc', 'tnpsc', 'wbcs', 'ras', 'uppsc']);
    const examName = (() => {
      const parts = item.testId.split('-');
      const examParts: string[] = [];
      for (const p of parts) {
        if (UPPER_EXAMS.has(p.toLowerCase())) {
          examParts.push(p.toUpperCase());
        } else if (examParts.length > 0) {
          break; // stop at first non-exam part
        }
      }
      return examParts.length > 0 ? examParts.join(' ') : null;
    })();
    const displayTitle = item.testTitle || 'Practice Test';
    const answered = Object.values(item.answers || {}).filter((a: any) => a !== undefined && a !== null).length;
    const totalQ = item.questions?.length || 0;
    const duration = formatDuration(item.startTime, item.endTime);
    const relDate = getRelativeDate(item.startTime);
    const timeStr = new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Results', { attemptId: item.id })}
        activeOpacity={0.65}
        style={styles.cardTouchable}
      >
        <View
          style={[
            styles.historyCard,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              ...(isDark ? shadows.dark.sm : shadows.light.md),
            },
          ]}
        >
          {/* ── Row 1: Title + Percentage ── */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleBlock}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {displayTitle}
              </Text>
              {examName && (
                <Text style={[styles.examSubtitle, { color: colors.textSecondary }]}>{examName}</Text>
              )}
            </View>

            {/* Score percentage — the single visual focus */}
            <View style={styles.scoreBlock}>
              <Text style={[styles.scorePctLarge, { color: scoreColor }]}>{pct}%</Text>
              <Text style={[styles.scoreRaw, { color: colors.textTertiary }]}>
                {item.score}/{item.totalMarks}
              </Text>
            </View>
          </View>

          {/* ── Row 2: Meta info ── */}
          <View style={styles.cardMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                {relDate} · {timeStr}
              </Text>
            </View>
            <View style={styles.metaDot} />
            {totalQ > 0 && (
              <>
                <View style={styles.metaItem}>
                  <Ionicons name="help-circle-outline" size={14} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                    {answered}/{totalQ}
                  </Text>
                </View>
                <View style={styles.metaDot} />
              </>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>{duration}</Text>
            </View>
          </View>

          {/* ── Row 3: CTA ── */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.reviewBtn, { backgroundColor: colors.primary + '12' }]}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('Solutions', { attemptId: item.id });
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
              <Text style={[styles.reviewBtnText, { color: colors.primary }]}>Review</Text>
            </TouchableOpacity>

            {pct < 50 && (
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.error + '12' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    'Retry Test',
                    'Start this test again with fresh answers?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Retry',
                        style: 'destructive',
                        onPress: () => navigation.navigate('TestInterface', {
                          testId: item.testId,
                          testTitle: item.testTitle || 'Practice Test',
                        }),
                      },
                    ]
                  );
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.error} />
                <Text style={[styles.retryBtnText, { color: colors.error }]}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Section Header ─────────────────────────────────────────────────────
  const renderSectionHeader = ({ section }: { section: { title: string; data: TestAttempt[] } }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{section.title}</Text>
      <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
        {section.data.length} test{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const currentSort = SORT_OPTIONS.find(s => s.key === sortBy)!;

  // ── List Header (Stats + Chart + Filters) ────────────────────────────────
  const ListHeader = () => (
    <>
      {/* Title */}
      <Text style={[styles.screenTitle, { color: colors.text }]}>Statistics</Text>

      {/* Month / Year Filters */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, selectedMonth === null && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedMonth(null)}
          >
            <Text style={[styles.chipText, { color: selectedMonth === null ? '#fff' : colors.textSecondary }]}>All</Text>
          </TouchableOpacity>
          {MONTHS.map((m, i) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, selectedMonth === i && { backgroundColor: colors.primary }]}
              onPress={() => setSelectedMonth(i)}
            >
              <Text style={[styles.chipText, { color: selectedMonth === i ? '#fff' : colors.textSecondary }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {availableYears.map(year => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearChip,
                { borderColor: colors.border },
                selectedYear === year && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.yearChipText, { color: selectedYear === year ? '#fff' : colors.text }]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stat Grid */}
      <View style={styles.statGrid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statGridItem}>
            <StatCard {...s} />
          </View>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Questions Solved</Text>
        {chartData ? (
          <View style={[styles.chartContainer, { backgroundColor: isDark ? colors.card : '#FFFFFF', ...(isDark ? shadows.dark.sm : shadows.light.sm) }]}>
            <LineChart
              data={chartData}
              width={Dimensions.get('window').width - spacing.lg * 2 - 2}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: isDark ? colors.card : '#FFFFFF',
                backgroundGradientTo: isDark ? colors.card : '#FFFFFF',
                decimalPlaces: 0,
                color: () => colors.primary,
                labelColor: () => colors.textTertiary,
                style: { borderRadius: borderRadius.lg },
                propsForDots: { r: '5', strokeWidth: '2', stroke: colors.primary },
                propsForBackgroundLines: { stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
              }}
              bezier
              style={{ borderRadius: borderRadius.lg }}
            />
          </View>
        ) : (
          <View style={[styles.emptyChart, { backgroundColor: isDark ? colors.card : '#FFFFFF', ...(isDark ? shadows.dark.sm : shadows.light.sm) }]}>
            <Ionicons name="bar-chart-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>
              Complete a test to see your progress
            </Text>
          </View>
        )}
      </View>

      {/* History Header */}
      <View style={styles.historyHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Test History</Text>
        <Text style={[styles.historyCount, { color: colors.textTertiary }]}>
          {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search + Sort */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? colors.card : colors.secondaryBackground,
              borderColor: isDark ? colors.border : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name or subject..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.sortBtn,
            {
              backgroundColor: isDark ? colors.card : colors.secondaryBackground,
              borderColor: isDark ? colors.border : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}
          onPress={() => setShowSortOptions(!showSortOptions)}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown */}
      {showSortOptions && (
        <View
          style={[
            styles.sortDropdown,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              ...(isDark ? shadows.dark.md : shadows.light.md),
              borderColor: isDark ? colors.border : '#F0F0F5',
              borderWidth: 1,
            },
          ]}
        >
          {SORT_OPTIONS.map((opt, idx) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortItem,
                sortBy === opt.key && { backgroundColor: colors.primary + '10' },
                idx < SORT_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
              onPress={() => {
                setSortBy(opt.key);
                setShowSortOptions(false);
              }}
            >
              <Ionicons name={opt.icon as any} size={20} color={sortBy === opt.key ? colors.primary : colors.textTertiary} />
              <Text style={[styles.sortItemText, { color: sortBy === opt.key ? colors.primary : colors.text }]}>
                {opt.label}
              </Text>
              {sortBy === opt.key && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderHistoryItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeader}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? 'No matching tests' : 'No tests completed yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              {searchQuery ? 'Try a different search term' : 'Complete a test to see your results here'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ paddingBottom: 110 }}>
            {hasMoreHistory && (
              <TouchableOpacity
                style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                onPress={() => fetchHistory(historyPage + 1)}
                disabled={isLoadingMoreHistory}
                activeOpacity={0.7}
              >
                {isLoadingMoreHistory ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="arrow-down-outline" size={18} color={colors.primary} />
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More Results</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg },

  // ── Screen Title ──
  screenTitle: {
    ...typography.largeTitle,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  // ── Filters ──
  filterSection: { gap: spacing.sm, marginBottom: spacing.xl },
  chipRow: { gap: 8, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  yearChipText: { fontSize: 12, fontWeight: '700' },

  // ── Stat Grid ──
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statGridItem: { width: (SCREEN_W - spacing.lg * 2 - spacing.md) / 2 },
  statCard: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    gap: 6,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  // ── Chart ──
  chartSection: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.title3, marginBottom: spacing.md },
  chartContainer: { borderRadius: borderRadius.lg, padding: 1, overflow: 'hidden' },
  emptyChart: {
    height: 200,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyChartText: { fontSize: 14, fontWeight: '500' },

  // ── History Header ──
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  historyCount: { fontSize: 13, fontWeight: '500' },

  // ── Search / Sort ──
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: borderRadius.md,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortDropdown: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.base,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    gap: 12,
  },
  sortItemText: { fontSize: 15, fontWeight: '500' },

  // ── Section Headers (date groups) ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHeaderText: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { fontSize: 12, fontWeight: '500' },

  // ── History Cards ──
  cardTouchable: { marginBottom: spacing.md },
  historyCard: {
    borderRadius: borderRadius.lg,
    padding: 18,
    gap: 14,
  },

  // Row 1 — title + score
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  cardTitleBlock: { flex: 1, gap: 6 },
  cardTitle: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  examSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  scoreBlock: { alignItems: 'flex-end', gap: 2 },
  scorePctLarge: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  scoreRaw: { fontSize: 12, fontWeight: '500' },

  // Row 2 — meta
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(142,142,147,0.4)' },

  // Row 3 — CTAs
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    minHeight: 36,
  },
  reviewBtnText: { fontSize: 14, fontWeight: '600' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    minHeight: 36,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600' },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, fontWeight: '400', textAlign: 'center', maxWidth: 260 },

  // ── Load More ──
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  loadMoreText: { fontSize: 15, fontWeight: '600' },
});
