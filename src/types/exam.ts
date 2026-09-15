export type QuestionType = "single" | "multi" | "truefalse" | "fill";

export interface Choice {
  id: string;
  text: string;
}

export interface Reference {
  title: string;
  url?: string;
}

export interface Domain {
  id: string;
  name: string;
  weight: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  domain: string;
  objective: string;
  stem: string;
  choices?: Choice[];
  selectCount?: number;
  answer: string[];
  explanation: string;
  references?: Reference[];
}

export interface Exam {
  id: string;
  title: string;
  vendor: string;
  code?: string;
  version: string;
  description: string;
  unofficial: true;
  passPercent: number;
  timeLimitMinutes: number;
  domains: Domain[];
  questions: Question[];
}

export interface CatalogEntry {
  id: string;
  title: string;
  vendor: string;
  version: string;
  path: string;
  questionCount: number;
  timeLimitMinutes: number;
  passPercent: number;
  domains: string[];
}

export interface Catalog {
  exams: CatalogEntry[];
}

export type SessionMode = "practice" | "exam";

export interface SessionConfig {
  examId: string;
  mode: SessionMode;
  timed: boolean;
  domainIds: string[];
  questionLimit: number | null;
}

export interface SessionState {
  id: string;
  examId: string;
  config: SessionConfig;
  questionIds: string[];
  /** Display order of choice ids per question. Missing on sessions started before shuffle. */
  choiceOrder?: Record<string, string[]>;
  currentIndex: number;
  answers: Record<string, string[]>;
  flagged: string[];
  submitted: Record<string, boolean>;
  startedAt: number;
  endsAt: number | null;
  finishedAt: number | null;
}

export interface DomainScore {
  id: string;
  name: string;
  correct: number;
  total: number;
}

export interface HistoryEntry {
  date: number;
  mode: SessionMode;
  timed: boolean;
  scorePercent: number;
  passed: boolean;
  correct: number;
  total: number;
  domainScores: DomainScore[];
}
