export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'MCQ' | 'NAT'; // NAT = Numerical Answer Type
export type Subject = 'Polity' | 'History' | 'Geography' | 'Economy' | 'Science' | 'Environment' | 'CSAT';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPro: boolean;
  streak: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index
  explanation?: string;
  subject: Subject;
  difficulty: Difficulty;
  type: QuestionType;
}

export interface TestSeries {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  totalTests: number;
  totalQuestions: number;
  duration: number; // minutes
  price: string;
  isPurchased: boolean;
  coverImage?: string;
}

export interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  startTime: number; // timestamp
  endTime?: number; // timestamp
  score: number;
  totalMarks: number;
  answers: Record<string, number>; // questionId -> optionIndex
  timeSpent: Record<string, number>; // questionId -> seconds
  status: 'In Progress' | 'Completed' | 'Abandoned';
}

export interface LibraryItem {
  id: string;
  questionId: string;
  savedAt: number;
  type: 'Saved' | 'Wrong' | 'Correct' | 'Learn';
  note?: string;
}
