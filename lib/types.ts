export type EntryType = "quick" | "reflection" | "comprehensive" | "cbt";

export interface Entry {
  id: string;
  user_id: string;
  entry_type: EntryType;
  issue_thread_id: string | null;
  title: string | null;
  content: Record<string, unknown> | null;
  prompts: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  imported: boolean;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

export interface EntryTag {
  entry_id: string;
  tag_id: string;
}

export interface MoodLog {
  id: string;
  entry_id: string;
  user_id: string;
  mood_score: number;
  custom_metrics: Record<string, number | string | boolean> | null;
}

export interface MetricDefinition {
  id: string;
  user_id: string;
  name: string;
  type: "number" | "text" | "boolean";
  unit: string | null;
}

export interface AIConversation {
  id: string;
  entry_id: string;
  user_id: string;
  messages: AIMessage[];
  created_at: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface IssueThread {
  id: string;
  user_id: string;
  title: string;
  started_at: string;
  status: "active" | "resolved";
}

export interface AIInsight {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  insight_type: "weekly_summary" | "theme_analysis" | "import_analysis";
  content: Record<string, unknown>;
  created_at: string;
}

export const ENTRY_TYPE_CONFIG: Record<
  EntryType,
  { label: string; description: string; icon: string; duration: string }
> = {
  quick: {
    label: "Quick Capture",
    description: "Jot down how you're feeling right now",
    icon: "Zap",
    duration: "~5 min",
  },
  reflection: {
    label: "Reflection Check-in",
    description: "A guided check-in on your day",
    icon: "SunMedium",
    duration: "~15 min",
  },
  comprehensive: {
    label: "Comprehensive Reflection",
    description: "A deep inventory of where you're at",
    icon: "BookOpen",
    duration: "~1 hour",
  },
  cbt: {
    label: "CBT Work-through",
    description: "Work through a specific issue with CBT techniques",
    icon: "Brain",
    duration: "Ongoing",
  },
};

export const MOOD_EMOJIS = ["😞", "😐", "🙂", "😊", "😄"] as const;

export const PHYSICAL_STATE_TAGS = [
  "Energized",
  "Rested",
  "Tired",
  "Sick",
  "Sore",
  "Tense",
  "Relaxed",
  "Hungry",
] as const;

export const EMOTIONAL_STATE_TAGS = [
  "Happy",
  "Calm",
  "Anxious",
  "Sad",
  "Angry",
  "Overwhelmed",
  "Grateful",
  "Motivated",
  "Lonely",
  "Hopeful",
  "Frustrated",
  "Content",
] as const;
