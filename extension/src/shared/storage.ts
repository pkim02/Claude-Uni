import {
  Course,
  Material,
  Assignment,
  Activity,
  SyncState,
  Settings,
  DEFAULT_SETTINGS,
} from "./types";

// ── Chrome Storage (metadata, small data) ──

interface ChromeStorageData {
  courses: Course[];
  assignments: Assignment[];
  activities: Activity[];
  syncState: SyncState;
  settings: Settings;
  chatHistories: Record<string, { role: string; content: string; timestamp: string }[]>;
}

const DEFAULT_SYNC_STATE: SyncState = {
  lastSyncedAt: null,
  inProgress: false,
  phase: "idle",
  message: "",
  coursesFound: 0,
  assignmentsFound: 0,
  materialsFound: 0,
};

async function getStorage<K extends keyof ChromeStorageData>(
  key: K
): Promise<ChromeStorageData[K]> {
  const defaults: ChromeStorageData = {
    courses: [],
    assignments: [],
    activities: [],
    syncState: DEFAULT_SYNC_STATE,
    settings: DEFAULT_SETTINGS,
    chatHistories: {},
  };
  const result = await chrome.storage.local.get(key);
  return (result[key] as ChromeStorageData[K]) ?? defaults[key];
}

async function setStorage<K extends keyof ChromeStorageData>(
  key: K,
  value: ChromeStorageData[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// ── Course Operations ──

export async function getCourses(): Promise<Course[]> {
  return getStorage("courses");
}

export async function getCourse(id: string): Promise<Course | undefined> {
  const courses = await getCourses();
  return courses.find((c) => c.id === id);
}

export async function getCourseByLearnusId(learnusId: string): Promise<Course | undefined> {
  const courses = await getCourses();
  return courses.find((c) => c.learnusId === learnusId);
}

export async function saveCourse(course: Course): Promise<void> {
  const courses = await getCourses();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx >= 0) {
    courses[idx] = course;
  } else {
    courses.push(course);
  }
  await setStorage("courses", courses);
}

export async function saveCourses(newCourses: Course[]): Promise<void> {
  await setStorage("courses", newCourses);
}

// ── Assignment Operations ──

export async function getAssignments(): Promise<Assignment[]> {
  return getStorage("assignments");
}

export async function getAssignment(id: string): Promise<Assignment | undefined> {
  const assignments = await getAssignments();
  return assignments.find((a) => a.id === id);
}

export async function getAssignmentByLearnusId(learnusId: string): Promise<Assignment | undefined> {
  const assignments = await getAssignments();
  return assignments.find((a) => a.learnusId === learnusId);
}

export async function getPendingAssignments(): Promise<Assignment[]> {
  const assignments = await getAssignments();
  return assignments.filter((a) => a.status !== "submitted");
}

export async function getDraftReadyAssignments(): Promise<Assignment[]> {
  const assignments = await getAssignments();
  return assignments.filter((a) => a.status === "draft_ready");
}

export async function saveAssignment(assignment: Assignment): Promise<void> {
  const assignments = await getAssignments();
  const idx = assignments.findIndex((a) => a.id === assignment.id);
  if (idx >= 0) {
    assignments[idx] = assignment;
  } else {
    assignments.push(assignment);
  }
  await setStorage("assignments", assignments);
}

export async function updateAssignment(
  id: string,
  updates: Partial<Assignment>
): Promise<Assignment | undefined> {
  const assignments = await getAssignments();
  const idx = assignments.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  assignments[idx] = { ...assignments[idx], ...updates };
  await setStorage("assignments", assignments);
  return assignments[idx];
}

// ── Activity Operations ──

export async function getActivities(): Promise<Activity[]> {
  const activities = await getStorage("activities");
  return activities.sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  );
}

export async function getUnreadActivities(): Promise<Activity[]> {
  const activities = await getActivities();
  return activities.filter((a) => !a.read);
}

export async function getUnreadCount(): Promise<number> {
  return (await getUnreadActivities()).length;
}

export async function saveActivity(activity: Activity): Promise<void> {
  const activities = await getStorage("activities");
  const existing = activities.find((a) => a.id === activity.id);
  if (!existing) {
    activities.push(activity);
    await setStorage("activities", activities);
  }
}

export async function markActivityRead(id: string): Promise<void> {
  const activities = await getStorage("activities");
  const activity = activities.find((a) => a.id === id);
  if (activity) {
    activity.read = true;
    await setStorage("activities", activities);
  }
}

export async function markAllActivitiesRead(): Promise<void> {
  const activities = await getStorage("activities");
  activities.forEach((a) => (a.read = true));
  await setStorage("activities", activities);
}

// ── Sync State ──

export async function getSyncState(): Promise<SyncState> {
  return getStorage("syncState");
}

export async function setSyncState(state: Partial<SyncState>): Promise<void> {
  const current = await getSyncState();
  await setStorage("syncState", { ...current, ...state });
}

export async function needsSync(): Promise<boolean> {
  const state = await getSyncState();
  if (state.inProgress) return false;
  if (!state.lastSyncedAt) return true;
  const elapsed = Date.now() - new Date(state.lastSyncedAt).getTime();
  return elapsed > 30 * 60 * 1000; // 30 minutes
}

// ── Settings ──

export async function getSettings(): Promise<Settings> {
  return getStorage("settings");
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await setStorage("settings", { ...current, ...settings });
}

// ── Chat History ──

export async function getChatHistory(
  courseId: string
): Promise<{ role: string; content: string; timestamp: string }[]> {
  const histories = await getStorage("chatHistories");
  return histories[courseId] || [];
}

export async function saveChatHistory(
  courseId: string,
  messages: { role: string; content: string; timestamp: string }[]
): Promise<void> {
  const histories = await getStorage("chatHistories");
  histories[courseId] = messages;
  await setStorage("chatHistories", histories);
}

// ── IndexedDB (large content: materials, drafts) ──

const DB_NAME = "claude-university";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("materials")) {
        db.createObjectStore("materials", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMaterial(material: Material): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("materials", "readwrite");
    tx.objectStore("materials").put(material);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMaterials(courseId: string): Promise<Material[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("materials", "readonly");
    const store = tx.objectStore("materials");
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as Material[];
      resolve(all.filter((m) => m.courseId === courseId));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getCourseContext(courseId: string): Promise<string> {
  const course = await getCourse(courseId);
  const materials = await getMaterials(courseId);

  let context = "";

  if (course) {
    context += `Course: ${course.name}\n`;
    if (course.description) context += `Description: ${course.description}\n`;
    context += "\nTopics:\n";
    course.topics.forEach((t) => {
      context += `- ${t.name}: ${t.description}\n`;
      if (t.subtopics.length > 0) {
        context += `  Subtopics: ${t.subtopics.join(", ")}\n`;
      }
    });
    context += "\nWeekly Schedule:\n";
    course.weekly_schedule.forEach((w) => {
      context += `Week ${w.week}: ${w.title}\n`;
      context += `  Topics: ${w.topics.join(", ")}\n`;
      context += `  Objectives: ${w.objectives.join("; ")}\n`;
    });
  }

  if (materials.length > 0) {
    context += "\n\nUploaded Materials:\n";
    materials.forEach((m) => {
      context += `\n--- ${m.filename} ---\n`;
      context += m.contentText.slice(0, 8000);
      context += "\n";
    });
  }

  return context;
}
