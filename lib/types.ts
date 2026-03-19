export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tier: "free" | "pro";
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  semester: string | null;
  topics: CourseTopic[];
  weekly_schedule: WeeklyTopic[];
  created_at: string;
  updated_at: string;
}

export interface CourseTopic {
  id: string;
  name: string;
  description: string;
  week: number | null;
  subtopics: string[];
  mastery: number; // 0-100
}

export interface WeeklyTopic {
  week: number;
  title: string;
  topics: string[];
  objectives: string[];
}

export interface Material {
  id: string;
  course_id: string;
  filename: string;
  file_type: "pdf" | "image" | "text";
  content_text: string;
  storage_path: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "short_answer" | "true_false";
  options?: string[];
  correct_answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export interface QuizResult {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_taken: number;
}

export interface StudyPlan {
  id: string;
  course_id: string;
  exam_date: string;
  plan_type: "regular" | "cram";
  days: StudyDay[];
  created_at: string;
}

export interface StudyDay {
  date: string;
  topics: string[];
  tasks: string[];
  estimated_hours: number;
  is_review: boolean;
}

export interface Progress {
  id: string;
  user_id: string;
  course_id: string;
  topic: string;
  mastery_level: number;
  quiz_scores: number[];
  last_studied: string;
  times_reviewed: number;
}
