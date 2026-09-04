export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary: string;
  keyPoints?: string[];
  topics: string[];
  goals?: string[];
  actionItems?: string[];
  mood: string;
  userNotes: string;
  conversation: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  status: "active" | "saved" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface SavedSummary {
  id: string;
  userId: string;
  journalId?: string;
  title: string;
  summary: string;
  keyPoints?: string[];
  topics?: string[];
  createdAt: string;
}

export interface SavedWeeklyInsight {
  id: string;
  userId: string;
  executiveOverview: string;
  clarityScore: number;
  frequentlyDiscussedTopics: string[];
  activeGoals: string[];
  completedGoals: string[];
  unfinishedActionItems: string[];
  recurringThemes: Array<{
    theme: string;
    description: string;
    sentiment: string;
  }>;
  decisionsMade: string[];
  suggestedNextActions: string[];
  generatedAt: string;
  analyzedRange?: string;
  analyzedJournalCount?: number;
}

export interface WeeklyLifeIntelligence {
  executiveAssessment: string;
  frequentlyDiscussedTopics: string[];
  activeGoals: string[];
  completedGoals: string[];
  unfinishedActionItems: string[];
  recurringThemes: Array<{
    theme: string;
    description: string;
    sentiment: string;
  }>;
  decisions: string[];
  suggestedNextActions: string[];
  wellnessScore: number;
  scoreRationale: string;
  generatedAt: string;
  analyzedRange?: string;
  analyzedJournalCount?: number;
}

export interface AIMemoryResult {
  answer: string;
  citedJournals: Array<{
    id: string;
    title: string;
    date: string;
    quoteExcerpt: string;
  }>;
}

export type ActiveTab =
  | "dashboard"
  | "journal"
  | "memory"
  | "history"
  | "insights"
  | "privacy";
