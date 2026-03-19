export interface ScrapingConfig {
  username: string;
  password: string;
  downloadDir: string;
  maxIterations?: number;
}

export interface ScrapingProgress {
  phase: "login" | "discovering" | "scraping" | "ingesting" | "complete" | "error";
  message: string;
  currentCourse?: string;
  coursesFound?: number;
  coursesScraped?: number;
  filesDownloaded?: number;
  timestamp: string;
}

export interface ScrapingResult {
  success: boolean;
  coursesCreated: string[];
  filesDownloaded: number;
  errors: string[];
}

export type ProgressCallback = (progress: ScrapingProgress) => void;

export type AssignmentStatus =
  | "new"           // Just detected from LearNUS
  | "drafting"      // AI is generating a draft
  | "draft_ready"   // Draft generated, needs review
  | "reviewed"      // Student has reviewed/edited
  | "submitted"     // Student submitted on LearNUS
  | "pending"       // Legacy: manual task, not yet solved
  | "in_progress"   // Legacy: AI is solving
  | "completed";    // Legacy: AI has solved

export interface HomeworkTask {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: AssignmentStatus;
  type: "assignment" | "quiz" | "essay" | "project" | "other";
  sourceUrl?: string;
  solution?: string;
  draftSolution?: string;
  finalSolution?: string;
  createdAt: string;
  updatedAt: string;
  draftedAt?: string;
  submittedAt?: string;
}

export type ActivityType = "assignment" | "material" | "announcement" | "grade" | "quiz";

export interface Activity {
  id: string;
  type: ActivityType;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  url: string;
  read: boolean;
  handled: boolean;
  detectedAt: string;
  dueDate: string | null;
}

export interface LearnUSNotification {
  id: string;
  type: "assignment" | "material" | "announcement" | "grade" | "quiz" | "other";
  courseName: string;
  title: string;
  description: string;
  dueDate: string | null;
  sourceUrl?: string;
  read: boolean;
  autoTaskCreated: boolean;
  detectedAt: string;
}

export interface NotificationCheckConfig {
  username: string;
  password: string;
  maxIterations?: number;
}

export interface NotificationCheckResult {
  success: boolean;
  notifications: LearnUSNotification[];
  tasksCreated: number;
  errors: string[];
}
