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
  lastActiveDate?: string; // ISO Date string YYYY-MM-DD
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_pro?: boolean;
  streak?: number;
  last_active_at?: string;
  created_at?: string;
  updated_at?: string;
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


export interface Exam {
  id: string;
  title: string;
  slug: string;
  icon_url?: string;
}

export interface TestSeries {
  id: string;
  examId: string;
  title: string;
  description: string;
  price: string;
  isActive: boolean;
  coverImage?: string;
  tests?: RemoteTest[]; // Optional, for nested fetching
}

export interface RemoteTest {
  id: string;
  seriesId?: string;
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
  testTitle: string;
  userId: string;
  startTime: number; // timestamp
  endTime?: number; // timestamp
  score: number;
  totalMarks: number;
  questions: Question[]; // Store the actual questions for this attempt
  answers: Record<string, number>; // questionId -> optionIndex
  markedForReview: Record<string, boolean>; // questionId -> marked
  timeSpent: Record<string, number>; // questionId -> seconds
  status: 'In Progress' | 'Completed' | 'Abandoned';
  currentIndex?: number; // For resuming
  timeRemaining?: number; // For resuming
}

export type LibraryItemType = 'saved' | 'wrong' | 'learn';

export interface LibraryItem {
  id: string; // unique ID for the library entry
  questionId: string;
  question: string;
  subject: Subject;
  difficulty: Difficulty;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  questionType?: QuestionType;
  type: LibraryItemType;
  saveTimestamp: number;
  exam?: string; // Optional exam tag
  examId?: string; // For filtering by Exam ID
  note?: string;
}
