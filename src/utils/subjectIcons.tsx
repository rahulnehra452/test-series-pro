import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export type Subject = 'Polity' | 'History' | 'Economy' | 'Geography' | 'Quant' | 'Current Affairs' | 'Science' | 'Environment' | 'Art & Culture' | 'General';

interface SubjectDetail {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
}

const SUBJECT_DETAILS: Record<string, SubjectDetail> = {
  'Polity': {
    color: '#007AFF',
    icon: 'library',
    gradient: ['#007AFF', '#00C6FF']
  },
  'History': {
    color: '#FF9500',
    icon: 'time',
    gradient: ['#FF9500', '#FFD60A']
  },
  'Economy': {
    color: '#34C759',
    icon: 'trending-up',
    gradient: ['#34C759', '#30D158']
  },
  'Geography': {
    color: '#AF52DE',
    icon: 'globe',
    gradient: ['#AF52DE', '#BF5AF2']
  },
  'Quant': {
    color: '#FF3B30',
    icon: 'calculator',
    gradient: ['#FF3B30', '#FF453A']
  },
  'Current Affairs': {
    color: '#5856D6',
    icon: 'newspaper',
    gradient: ['#5856D6', '#5E5CE6']
  },
  'Science': {
    color: '#00C7BE',
    icon: 'flask',
    gradient: ['#00C7BE', '#64D2FF']
  },
  'Environment': {
    color: '#30B0C7',
    icon: 'leaf',
    gradient: ['#30B0C7', '#5AC8FA']
  },
  'Art & Culture': {
    color: '#FF2D55',
    icon: 'color-palette',
    gradient: ['#FF2D55', '#FF375F']
  },
  'General': {
    color: colors.light.primary,
    icon: 'book',
    gradient: [colors.light.primary, '#6366F1']
  }
};

export const getSubjectDetails = (subject: string): SubjectDetail => {
  return SUBJECT_DETAILS[subject] || SUBJECT_DETAILS['General'];
};
