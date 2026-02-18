import { NavigatorScreenParams } from '@react-navigation/native';
import { TestAttempt } from './index';

export type MainTabParamList = {
  Home: undefined;
  Tests: undefined;
  Library: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  ExamDetails: { examId: string; examTitle: string };
  SeriesDetails: { seriesId: string; seriesTitle: string };
  TestInterface: { testId: string; testTitle: string };
  Results: { attemptId?: string; result?: TestAttempt };
  Solutions: { attemptId?: string; result?: TestAttempt };
  SeedData: undefined;
  Pricing: undefined;
};
