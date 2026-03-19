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

export interface HomeworkTask {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: "pending" | "in_progress" | "completed";
  type: "assignment" | "quiz" | "essay" | "project" | "other";
  sourceUrl?: string;
  solution?: string;
  createdAt: string;
  updatedAt: string;
}
