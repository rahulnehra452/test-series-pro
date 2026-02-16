import { TestAttempt, LibraryItem, Question, Subject } from '../types';

export const SUBJECTS: Subject[] = ['Polity', 'History', 'Geography', 'Economy', 'Science', 'Environment', 'CSAT'];

// Helper to format date as DD/MM in local time
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

// Optimization: Cache timezone offset
const tzOffset = new Date().getTimezoneOffset() * 60000;

// Helper: Get local YYYY-MM-DD key to avoid UTC shifts
const getLocalDateKey = (timestamp: number) => {
  const localDate = new Date(timestamp - tzOffset);
  return localDate.toISOString().split('T')[0];
};

// 1. Score Trend (Line Chart)
// Optimization: Slice before filtering if we know history is sorted or roughly sorted.
// However, history usually comes in most-recent-first from fetchHistory.
export const getScoreTrend = (history: TestAttempt[]) => {
  // We only need the 10 most recent COMPLETED tests.
  const recentCompleted: TestAttempt[] = [];

  // Iterate backwards (assuming history is most-recent-first)
  for (let i = 0; i < history.length && recentCompleted.length < 10; i++) {
    const h = history[i];
    if (h.status === 'Completed' && h.totalMarks > 0) {
      recentCompleted.push(h);
    }
  }

  if (recentCompleted.length === 0) return null;

  // Reverse so they are in chronological order for the chart
  const recent = recentCompleted.reverse();

  return {
    labels: recent.map(t => formatDate(t.startTime)),
    datasets: [{
      data: recent.map(t => Math.round((t.score / t.totalMarks) * 100))
    }]
  };
};

// 2. Subject-wise Accuracy (Horizontal Bar)
export const getSubjectAccuracy = (history: TestAttempt[]) => {
  const subjectStats: Record<string, { correct: number; total: number }> = {};

  // Initialize standard subjects
  SUBJECTS.forEach(s => subjectStats[s] = { correct: 0, total: 0 });
  // Add catch-all
  subjectStats['Other'] = { correct: 0, total: 0 };

  for (const attempt of history) {
    if (!attempt.questions) continue;

    for (const q of attempt.questions) {
      const subject: string = q.subject || 'Other';
      const stats = subjectStats[subject] || subjectStats['Other'];

      const userAnswer = attempt.answers[q.id];
      if (userAnswer !== undefined && userAnswer !== null) {
        stats.total++;
        if (userAnswer === q.correctAnswer) {
          stats.correct++;
        }
      }
    }
  }

  const labels: string[] = [];
  const data: number[] = [];

  Object.entries(subjectStats).forEach(([subject, stats]) => {
    if (stats.total > 0) {
      labels.push(subject);
      data.push(Math.round((stats.correct / stats.total) * 100));
    }
  });

  return { labels, data };
};

// 3. Daily Study Hours (Bar Chart)
export const getDailyStudyHours = (history: TestAttempt[]) => {
  const dailyMap: Record<string, number> = {}; // "YYYY-MM-DD" -> milliseconds

  // Calculate cut-off for last 7 days to avoid processing old data
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const cutoffTime = sevenDaysAgo.getTime();

  for (const attempt of history) {
    if (!attempt.startTime || attempt.startTime < cutoffTime) {
      // If history is sorted most-recent-first, we could break here.
      // But let's be safe and just continue.
      continue;
    }

    const dateKey = getLocalDateKey(attempt.startTime);
    let duration = 0;

    if (attempt.endTime) {
      duration = attempt.endTime - attempt.startTime;
    } else if (attempt.status === 'In Progress') {
      const now = Date.now();
      duration = Math.min(now - attempt.startTime, 10800000); // Cap 3h
    }

    if (duration > 0) {
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + duration;
    }
  }

  const labels: string[] = [];
  const data: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = getLocalDateKey(d.getTime());
    const label = `${d.getDate()}/${d.getMonth() + 1}`;

    labels.push(label);
    const hours = (dailyMap[dateKey] || 0) / 3600000;
    data.push(Number(hours.toFixed(1)));
  }

  return {
    labels,
    datasets: [{ data }]
  };
};

// 4. Syllabus Coverage
export const getSyllabusCoverage = (history: TestAttempt[]) => {
  const coveredSet: Record<string, Set<string>> = {};
  const revisedSet: Record<string, Set<string>> = {};

  SUBJECTS.forEach(s => {
    coveredSet[s] = new Set();
    revisedSet[s] = new Set();
  });

  const attemptCounts: Record<string, number> = {};
  const questionSubjectMap: Record<string, string> = {};

  for (const h of history) {
    if (!h.questions) continue;

    for (const q of h.questions) {
      if (!questionSubjectMap[q.id]) {
        questionSubjectMap[q.id] = q.subject || 'Other';
      }

      const ans = h.answers[q.id];
      if (ans !== undefined && ans !== null) {
        attemptCounts[q.id] = (attemptCounts[q.id] || 0) + 1;
      }
    }
  }

  Object.entries(attemptCounts).forEach(([qId, count]) => {
    const subject = questionSubjectMap[qId];
    const covered = coveredSet[subject];
    const revised = revisedSet[subject];

    if (covered) {
      if (count >= 1) covered.add(qId);
      if (count >= 2) revised.add(qId);
    }
  });

  const result: Record<string, { covered: number; revised: number }> = {};
  SUBJECTS.forEach(s => {
    result[s] = {
      covered: coveredSet[s].size,
      revised: revisedSet[s].size
    };
  });

  return result;
};

// 5. Questions Stacked Bar (Correct vs Wrong per day)
export const getDailyQuestionsStats = (history: TestAttempt[]) => {
  const dailyMap: Record<string, { correct: number; wrong: number }> = {};
  const dates: string[] = [];

  // Cutoff for 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const cutoffTime = sevenDaysAgo.getTime();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = getLocalDateKey(d.getTime());
    dailyMap[k] = { correct: 0, wrong: 0 };
    dates.push(k);
  }

  for (const attempt of history) {
    if (!attempt.startTime || attempt.startTime < cutoffTime) continue;

    const k = getLocalDateKey(attempt.startTime);
    const stats = dailyMap[k];

    if (stats && attempt.questions) {
      for (const q of attempt.questions) {
        const ans = attempt.answers[q.id];
        if (ans !== undefined && ans !== null) {
          if (ans === q.correctAnswer) stats.correct++;
          else stats.wrong++;
        }
      }
    }
  }

  return {
    labels: dates.map(d => {
      const parts = d.split('-');
      return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
    }),
    legend: ['Correct', 'Wrong'],
    data: dates.map(d => [dailyMap[d].correct, dailyMap[d].wrong]),
    barColors: ['#34C759', '#FF3B30']
  };
};

// 6. Weak Topics (Accuracy < 40%)
export const getWeakTopics = (history: TestAttempt[]) => {
  const { labels, data } = getSubjectAccuracy(history);
  const weak: { subject: string; accuracy: number }[] = [];

  for (let i = 0; i < labels.length; i++) {
    if (data[i] < 40) {
      weak.push({ subject: labels[i], accuracy: data[i] });
    }
  }

  return weak.sort((a, b) => a.accuracy - b.accuracy);
};
