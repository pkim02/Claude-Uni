// ── Chrome Runtime Message Protocol ──
// All communication between content scripts, background worker, and UI

// Messages FROM UI or content scripts TO background worker
export type BackgroundMessage =
  | { type: "SYNC_LEARNUS"; force?: boolean }
  | { type: "SYNC_STATUS" }
  | { type: "AI_REQUEST"; id: string; systemPrompt: string; userPrompt: string }
  | { type: "AI_CANCEL"; id: string }
  | { type: "AUTO_DRAFT"; assignmentId: string }
  | { type: "GET_COURSES" }
  | { type: "GET_ASSIGNMENTS" }
  | { type: "GET_ACTIVITIES" }
  | { type: "UPDATE_ASSIGNMENT"; assignmentId: string; updates: Record<string, unknown> }
  | { type: "MARK_ACTIVITY_READ"; activityId: string }
  | { type: "SAVE_SETTINGS"; settings: Record<string, unknown> };

// Messages FROM background worker TO UI (via chrome.runtime.sendMessage or port)
export type UIMessage =
  | { type: "SYNC_PROGRESS"; phase: string; message: string }
  | { type: "SYNC_COMPLETE"; result: SyncResultData }
  | { type: "SYNC_ERROR"; error: string }
  | { type: "AI_CHUNK"; id: string; text: string }
  | { type: "AI_DONE"; id: string; fullText: string }
  | { type: "AI_ERROR"; id: string; error: string }
  | { type: "DRAFT_PROGRESS"; assignmentId: string; status: string }
  | { type: "DRAFT_COMPLETE"; assignmentId: string; draft: string }
  | { type: "DATA_UPDATED" }; // Generic signal to refetch data

// Messages FROM background worker TO content scripts
export type ContentScriptMessage =
  | { type: "SCRAPE_PAGE"; pageType: "dashboard" | "course" | "assignments" | "materials" | "grades" }
  | { type: "SCRAPE_COURSE_DETAIL"; courseUrl: string }
  | { type: "AI_SEND_PROMPT"; id: string; prompt: string }
  | { type: "AI_ABORT"; id: string };

// Messages FROM content scripts TO background worker
export type ScrapedDataMessage =
  | { type: "SCRAPED_COURSES"; courses: ScrapedCourse[] }
  | { type: "SCRAPED_ASSIGNMENTS"; courseId: string; assignments: ScrapedAssignment[] }
  | { type: "SCRAPED_MATERIALS"; courseId: string; materials: ScrapedMaterial[] }
  | { type: "SCRAPED_ANNOUNCEMENTS"; courseId: string; announcements: ScrapedAnnouncement[] }
  | { type: "SCRAPED_GRADES"; courseId: string; grades: ScrapedGrade[] }
  | { type: "SCRAPE_ERROR"; error: string }
  | { type: "AI_RESPONSE_CHUNK"; id: string; text: string }
  | { type: "AI_RESPONSE_DONE"; id: string; fullText: string }
  | { type: "AI_RESPONSE_ERROR"; id: string; error: string };

// ── Scraped Data Shapes (raw from DOM) ──

export interface ScrapedCourse {
  learnusId: string;
  name: string;
  url: string;
  semester: string;
}

export interface ScrapedAssignment {
  learnusId: string;
  title: string;
  instructions: string;
  dueDate: string | null;
  url: string;
  type: "assignment" | "quiz" | "essay" | "other";
  attachments: string[];
  status: string; // "submitted", "not submitted", etc.
}

export interface ScrapedMaterial {
  title: string;
  url: string;
  fileType: string;
  section: string; // Week/section name
}

export interface ScrapedAnnouncement {
  title: string;
  content: string;
  author: string;
  date: string;
}

export interface ScrapedGrade {
  assignmentName: string;
  grade: string;
  maxGrade: string;
  feedback: string;
}

export interface SyncResultData {
  coursesFound: number;
  newAssignments: number;
  newMaterials: number;
  newAnnouncements: number;
  errors: string[];
}
