/**
 * Scrape assignments from a LearNUS course page.
 * Handles Moodle's assignment activity type.
 */

import type { ScrapedAssignment } from "@/shared/messages";

export function scrapeAssignments(): ScrapedAssignment[] {
  const assignments: ScrapedAssignment[] = [];

  // Strategy 1: Assignment activities on course page
  const assignActivities = document.querySelectorAll(
    '.activity.assign, .activity.modtype_assign, li[class*="assign"]'
  );
  assignActivities.forEach((activity) => {
    const assignment = parseAssignmentActivity(activity);
    if (assignment) assignments.push(assignment);
  });

  // Strategy 2: Assignment detail page (if we're on one)
  if (assignments.length === 0 && window.location.href.includes("/mod/assign/")) {
    const detail = parseAssignmentDetailPage();
    if (detail) assignments.push(detail);
  }

  // Strategy 3: All activities that look like assignments
  if (assignments.length === 0) {
    const allActivities = document.querySelectorAll(
      'a[href*="/mod/assign/view.php"]'
    );
    allActivities.forEach((link) => {
      const assignment = parseAssignmentLink(link as HTMLAnchorElement);
      if (assignment) assignments.push(assignment);
    });
  }

  // Also look for quizzes
  const quizActivities = document.querySelectorAll(
    '.activity.quiz, .activity.modtype_quiz, a[href*="/mod/quiz/view.php"]'
  );
  quizActivities.forEach((activity) => {
    const quiz = parseQuizActivity(activity);
    if (quiz) assignments.push(quiz);
  });

  return assignments;
}

function parseAssignmentActivity(activity: Element): ScrapedAssignment | null {
  const link = activity.querySelector('a[href*="/mod/assign/"]') as HTMLAnchorElement;
  if (!link) return null;

  const title = link.textContent?.trim() || "";
  const url = link.href;
  const learnusId = extractModId(url);

  // Look for due date
  const dueDate = extractDueDate(activity);

  // Look for description/instructions
  const desc =
    activity.querySelector(".contentafterlink, .activity-description")?.textContent?.trim() || "";

  // Check submission status
  const statusEl = activity.querySelector(".submission-status, .submissionstatustd");
  const status = statusEl?.textContent?.trim() || "";

  return {
    learnusId,
    title,
    instructions: desc,
    dueDate,
    url,
    type: "assignment",
    attachments: extractAttachments(activity),
    status,
  };
}

function parseAssignmentDetailPage(): ScrapedAssignment | null {
  const title =
    document.querySelector("h2, .page-header-headings h1")?.textContent?.trim() || "";
  if (!title) return null;

  const url = window.location.href;
  const learnusId = extractModId(url);

  // Get full instructions from the detail page
  const instructions =
    document.querySelector(
      ".submissionfull, .assignsubmission_onlinetext, .no-overflow"
    )?.textContent?.trim() ||
    document.querySelector(".activity-description, .intro")?.textContent?.trim() ||
    "";

  // Due date from submission status table
  const dueDate = extractDueDateFromTable();

  // Submission status
  const statusEl = document.querySelector(
    '.submissionstatustd, [data-region="submission-status"]'
  );
  const status = statusEl?.textContent?.trim() || "";

  return {
    learnusId,
    title,
    instructions,
    dueDate,
    url,
    type: "assignment",
    attachments: extractAttachments(document.body),
    status,
  };
}

function parseAssignmentLink(link: HTMLAnchorElement): ScrapedAssignment | null {
  const title = link.textContent?.trim() || "";
  const url = link.href;
  const learnusId = extractModId(url);

  if (!title || !learnusId) return null;

  return {
    learnusId,
    title,
    instructions: "",
    dueDate: null,
    url,
    type: "assignment",
    attachments: [],
    status: "",
  };
}

function parseQuizActivity(activity: Element): ScrapedAssignment | null {
  const link = (
    activity instanceof HTMLAnchorElement
      ? activity
      : activity.querySelector('a[href*="/mod/quiz/"]')
  ) as HTMLAnchorElement;
  if (!link) return null;

  const title = link.textContent?.trim() || "";
  const url = link.href;
  const learnusId = extractModId(url);

  return {
    learnusId,
    title,
    instructions: "",
    dueDate: extractDueDate(activity),
    url,
    type: "quiz",
    attachments: [],
    status: "",
  };
}

function extractModId(url: string): string {
  const match = url.match(/[?&]id=(\d+)/);
  return match ? match[1] : `mod-${Date.now()}`;
}

function extractDueDate(container: Element): string | null {
  // Look for date patterns in text content
  const text = container.textContent || "";

  // Korean date format: 2026년 3월 20일
  const koreanMatch = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    return `${koreanMatch[1]}-${koreanMatch[2].padStart(2, "0")}-${koreanMatch[3].padStart(2, "0")}`;
  }

  // Standard date: March 20, 2026 or 2026-03-20
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // Moodle date element
  const dateEl = container.querySelector(".date, time, [datetime]");
  if (dateEl) {
    const datetime = dateEl.getAttribute("datetime");
    if (datetime) return datetime.split("T")[0];
  }

  return null;
}

function extractDueDateFromTable(): string | null {
  // On assignment detail page, due date is often in the submission status table
  const rows = document.querySelectorAll(
    ".submissionstatustable tr, .generaltable tr"
  );
  for (const row of rows) {
    const header = row.querySelector("th, td:first-child")?.textContent || "";
    if (
      header.includes("마감") ||
      header.includes("Due date") ||
      header.includes("종료")
    ) {
      const value = row.querySelector("td:last-child, td:nth-child(2)")?.textContent || "";
      const dateMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) return dateMatch[0];

      const koreanMatch = value.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (koreanMatch) {
        return `${koreanMatch[1]}-${koreanMatch[2].padStart(2, "0")}-${koreanMatch[3].padStart(2, "0")}`;
      }
    }
  }
  return null;
}

function extractAttachments(container: Element): string[] {
  const attachments: string[] = [];
  const fileLinks = container.querySelectorAll(
    'a[href*="/pluginfile.php"], a[href*="mod_assign"]'
  );
  fileLinks.forEach((link) => {
    const name = link.textContent?.trim();
    if (name) attachments.push(name);
  });
  return attachments;
}
