export type ScoreStatus = 'excellent' | 'good' | 'average' | 'poor';

interface ScoreConfig {
  color: string;
  label: string;
  icon: string;
  status: ScoreStatus;
}

export const getScorePercentage = (score: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((score / total) * 100));
};

export const getScoreConfig = (percentage: number, colors: any): ScoreConfig => {
  if (percentage >= 70) {
    return {
      color: colors.success,
      label: 'Excellent',
      icon: 'checkmark-circle',
      status: 'excellent',
    };
  }
  if (percentage >= 50) {
    return {
      color: colors.primary,
      label: 'Good',
      icon: 'trending-up',
      status: 'good',
    };
  }
  if (percentage >= 30) {
    return {
      color: colors.warning,
      label: 'Average',
      icon: 'alert-circle',
      status: 'average',
    };
  }
  return {
    color: colors.error,
    label: 'Needs Improvement',
    icon: 'close-circle',
    status: 'poor',
  };
};

export const getScoreColor = (score: number, total: number, colors: any): string => {
  const percentage = getScorePercentage(score, total);
  return getScoreConfig(percentage, colors).color;
};
