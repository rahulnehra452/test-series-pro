import { colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export const getSubjectColor = (subject: string, currentColors: typeof colors.light | typeof colors.dark): string => {
  const normalizedSubject = subject.toLowerCase().trim();

  if (normalizedSubject.includes('history')) return currentColors.subject.history;
  if (normalizedSubject.includes('polity') || normalizedSubject.includes('constitution')) return currentColors.subject.polity;
  if (normalizedSubject.includes('econom')) return currentColors.subject.economy;
  if (normalizedSubject.includes('geograph')) return currentColors.subject.geography;
  if (normalizedSubject.includes('science') || normalizedSubject.includes('tech')) return currentColors.subject.science;
  if (normalizedSubject.includes('env') || normalizedSubject.includes('eco')) return currentColors.subject.environment;
  if (normalizedSubject.includes('affair')) return currentColors.subject.currentAffairs;

  return currentColors.subject.other;
};
