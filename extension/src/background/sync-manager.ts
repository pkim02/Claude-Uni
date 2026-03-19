/**
 * Sync Manager — orchestrates LearNUS scraping via content scripts.
 *
 * Flow:
 * 1. Open LearNUS tab (or reuse existing)
 * 2. Navigate to dashboard → content script scrapes courses
 * 3. For each course → navigate → content script scrapes assignments + materials
 * 4. Store results, detect new items
 * 5. Auto-draft new assignments
 */

import {
  getSyncState,
  setSyncState,
  getCourses,
  saveCourse,
  getAssignments,
  saveAssignment,
  saveActivity,
  getSettings,
  getCourseContext,
} from "@/shared/storage";
import type {
  ScrapedCourse,
  ScrapedAssignment,
  ScrapedMaterial,
  ScrapedAnnouncement,
} from "@/shared/messages";
import type { Course, Assignment, Activity } from "@/shared/types";
import { buildHomeworkSolverPrompt } from "@/shared/prompts/homework-solver";

export class SyncManager {
  private learnusTabId: number | null = null;
  private pendingCourses: ScrapedCourse[] = [];
  private courseIndex = 0;

  async startSync(force?: boolean): Promise<{ started: boolean }> {
    const state = await getSyncState();
    if (state.inProgress && !force) {
      return { started: false };
    }

    const settings = await getSettings();
    if (!settings.learnusCredentials) {
      await setSyncState({ phase: "error", message: "No LearNUS credentials set" });
      return { started: false };
    }

    await setSyncState({
      inProgress: true,
      phase: "logging_in",
      message: "Opening LearNUS...",
    });

    // Broadcast progress to UI
    this.broadcast({ type: "SYNC_PROGRESS", phase: "logging_in", message: "Opening LearNUS..." });

    try {
      // Find or create LearNUS tab
      await this.openLearnusTab();
      return { started: true };
    } catch (err) {
      await setSyncState({
        inProgress: false,
        phase: "error",
        message: (err as Error).message,
      });
      return { started: false };
    }
  }

  async getStatus() {
    return getSyncState();
  }

  // ── Handlers for scraped data from content scripts ──

  async handleScrapedCourses(scrapedCourses: ScrapedCourse[]) {
    this.pendingCourses = scrapedCourses;
    this.courseIndex = 0;

    await setSyncState({
      phase: "scraping_courses",
      message: `Found ${scrapedCourses.length} courses`,
      coursesFound: scrapedCourses.length,
    });
    this.broadcast({
      type: "SYNC_PROGRESS",
      phase: "scraping_courses",
      message: `Found ${scrapedCourses.length} courses`,
    });

    // Store courses
    const existingCourses = await getCourses();
    for (const scraped of scrapedCourses) {
      const existing = existingCourses.find((c) => c.learnusId === scraped.learnusId);
      if (!existing) {
        const newCourse: Course = {
          id: `course-${scraped.learnusId}`,
          name: scraped.name,
          description: "",
          semester: scraped.semester,
          learnusId: scraped.learnusId,
          learnusUrl: scraped.url,
          topics: [],
          weekly_schedule: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await saveCourse(newCourse);
      }
    }

    // Start scraping each course
    await this.scrapeNextCourse();
  }

  async handleScrapedAssignments(courseId: string, scrapedAssignments: ScrapedAssignment[]) {
    const existingAssignments = await getAssignments();
    let newCount = 0;

    const courses = await getCourses();
    const course = courses.find((c) => c.learnusId === courseId || c.id === `course-${courseId}`);
    const courseName = course?.name || "Unknown Course";

    for (const scraped of scrapedAssignments) {
      const existing = existingAssignments.find((a) => a.learnusId === scraped.learnusId);
      if (!existing) {
        const assignment: Assignment = {
          id: `assign-${scraped.learnusId}-${Date.now()}`,
          courseId: `course-${courseId}`,
          courseName,
          learnusId: scraped.learnusId,
          learnusUrl: scraped.url,
          title: scraped.title,
          instructions: scraped.instructions,
          type: scraped.type as Assignment["type"],
          dueDate: scraped.dueDate,
          status: "new",
          draftSolution: "",
          finalSolution: "",
          attachments: scraped.attachments,
          detectedAt: new Date().toISOString(),
          draftedAt: null,
          submittedAt: null,
        };
        await saveAssignment(assignment);
        newCount++;

        // Create activity
        const activity: Activity = {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: scraped.type === "quiz" ? "quiz" : "assignment",
          courseId: `course-${courseId}`,
          courseName,
          title: scraped.title,
          description: scraped.instructions.slice(0, 200),
          url: scraped.url,
          read: false,
          handled: false,
          detectedAt: new Date().toISOString(),
          dueDate: scraped.dueDate,
        };
        await saveActivity(activity);
      }
    }

    await setSyncState({
      assignmentsFound: (await getSyncState()).assignmentsFound + newCount,
    });

    if (newCount > 0) {
      this.broadcast({
        type: "SYNC_PROGRESS",
        phase: "scraping_assignments",
        message: `${courseName}: ${newCount} new assignments found`,
      });
    }

    // Continue to next course
    await this.scrapeNextCourse();
  }

  async handleScrapedMaterials(courseId: string, scrapedMaterials: ScrapedMaterial[]) {
    const courses = await getCourses();
    const course = courses.find((c) => c.learnusId === courseId || c.id === `course-${courseId}`);
    const courseName = course?.name || "Unknown Course";

    // Create activities for new materials
    for (const scraped of scrapedMaterials) {
      const activity: Activity = {
        id: `activity-mat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "material",
        courseId: `course-${courseId}`,
        courseName,
        title: scraped.title,
        description: `${scraped.fileType} — ${scraped.section}`,
        url: scraped.url,
        read: false,
        handled: false,
        detectedAt: new Date().toISOString(),
        dueDate: null,
      };
      await saveActivity(activity);
    }

    await setSyncState({
      materialsFound: (await getSyncState()).materialsFound + scrapedMaterials.length,
    });
  }

  async handleScrapedAnnouncements(courseId: string, announcements: ScrapedAnnouncement[]) {
    const courses = await getCourses();
    const course = courses.find((c) => c.learnusId === courseId || c.id === `course-${courseId}`);
    const courseName = course?.name || "Unknown Course";

    for (const ann of announcements) {
      const activity: Activity = {
        id: `activity-ann-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "announcement",
        courseId: `course-${courseId}`,
        courseName,
        title: ann.title,
        description: ann.content.slice(0, 200),
        url: "",
        read: false,
        handled: true,
        detectedAt: new Date().toISOString(),
        dueDate: null,
      };
      await saveActivity(activity);
    }
  }

  // ── Auto-draft ──

  async autoDraft(assignmentId: string) {
    const { getAssignment, updateAssignment } = await import("@/shared/storage");
    const assignment = await getAssignment(assignmentId);
    if (!assignment) return { error: "Assignment not found" };

    await updateAssignment(assignmentId, { status: "drafting" });
    this.broadcast({
      type: "DRAFT_PROGRESS",
      assignmentId,
      status: "Generating draft...",
    });

    // Build the prompt
    const courseContext = await getCourseContext(assignment.courseId);
    const prompt = buildHomeworkSolverPrompt(
      assignment.courseName,
      courseContext,
      `${assignment.title}\n\n${assignment.instructions}`,
      "solve"
    );

    // Send to AI queue
    const requestId = `draft-${assignmentId}-${Date.now()}`;
    chrome.runtime.sendMessage({
      type: "AI_REQUEST",
      id: requestId,
      systemPrompt: "",
      userPrompt: prompt,
    });

    // The AI queue will handle the response and update the assignment
    // We store the mapping so we can route the response
    await chrome.storage.local.set({
      [`draft_request_${requestId}`]: assignmentId,
    });

    return { started: true, requestId };
  }

  // ── Internal ──

  private async openLearnusTab() {
    // Check for existing LearNUS tab
    const tabs = await chrome.tabs.query({ url: "*://learnus.yonsei.ac.kr/*" });
    if (tabs.length > 0 && tabs[0].id) {
      this.learnusTabId = tabs[0].id;
      // Navigate to dashboard
      await chrome.tabs.update(this.learnusTabId, {
        url: "https://learnus.yonsei.ac.kr/my/",
      });
    } else {
      // Open new tab
      const tab = await chrome.tabs.create({
        url: "https://learnus.yonsei.ac.kr/my/",
        active: false, // Open in background
      });
      this.learnusTabId = tab.id!;
    }

    // Wait for page load, then content script will auto-report courses
    // The content script's detectAndReport() will fire and send SCRAPED_COURSES
  }

  private async scrapeNextCourse() {
    if (this.courseIndex >= this.pendingCourses.length) {
      // Done scraping all courses
      await this.finishSync();
      return;
    }

    const course = this.pendingCourses[this.courseIndex];
    this.courseIndex++;

    await setSyncState({
      phase: "scraping_assignments",
      message: `Scraping: ${course.name}`,
    });
    this.broadcast({
      type: "SYNC_PROGRESS",
      phase: "scraping_assignments",
      message: `Scraping: ${course.name}`,
    });

    // Navigate to the course page
    if (this.learnusTabId) {
      await chrome.tabs.update(this.learnusTabId, { url: course.url });
      // Content script will load and we can send it a scrape command
      // Wait a bit for the page to load
      setTimeout(async () => {
        if (this.learnusTabId) {
          try {
            await chrome.tabs.sendMessage(this.learnusTabId, {
              type: "SCRAPE_PAGE",
              pageType: "assignments",
            });
            await chrome.tabs.sendMessage(this.learnusTabId, {
              type: "SCRAPE_PAGE",
              pageType: "materials",
            });
          } catch {
            // Content script not ready yet, skip this course
            await this.scrapeNextCourse();
          }
        }
      }, 3000);
    }
  }

  private async finishSync() {
    const state = await getSyncState();

    await setSyncState({
      inProgress: false,
      phase: "complete",
      message: "Sync complete",
      lastSyncedAt: new Date().toISOString(),
    });

    this.broadcast({
      type: "SYNC_COMPLETE",
      result: {
        coursesFound: state.coursesFound,
        newAssignments: state.assignmentsFound,
        newMaterials: state.materialsFound,
        newAnnouncements: 0,
        errors: [],
      },
    });

    // Auto-draft new assignments
    const assignments = await getAssignments();
    const newAssignments = assignments.filter((a) => a.status === "new");
    for (const assignment of newAssignments) {
      await this.autoDraft(assignment.id);
    }

    // Notify UI to refresh
    this.broadcast({ type: "DATA_UPDATED" });
  }

  private broadcast(message: unknown) {
    chrome.runtime.sendMessage(message).catch(() => {
      // No listeners — that's fine
    });
  }
}
