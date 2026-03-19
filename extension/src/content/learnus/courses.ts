/**
 * Scrape course list from LearNUS dashboard.
 * LearNUS is Moodle-based, so we use Moodle's standard DOM structure.
 */

import type { ScrapedCourse } from "@/shared/messages";

export function scrapeDashboardCourses(): ScrapedCourse[] {
  const courses: ScrapedCourse[] = [];

  // Strategy 1: Moodle course cards (common layout)
  const courseCards = document.querySelectorAll(
    '.course-card, .coursebox, [data-region="course-content"]'
  );
  courseCards.forEach((card) => {
    const course = parseCourseCard(card);
    if (course) courses.push(course);
  });

  // Strategy 2: Course list links (fallback)
  if (courses.length === 0) {
    const courseLinks = document.querySelectorAll(
      '.coursename a, .course_title a, a[href*="/course/view.php"]'
    );
    courseLinks.forEach((link) => {
      const course = parseCourseLink(link as HTMLAnchorElement);
      if (course) courses.push(course);
    });
  }

  // Strategy 3: Side navigation (another fallback)
  if (courses.length === 0) {
    const navLinks = document.querySelectorAll(
      'nav a[href*="/course/view.php"], .nav-drawer a[href*="/course/view.php"]'
    );
    navLinks.forEach((link) => {
      const course = parseCourseLink(link as HTMLAnchorElement);
      if (course) courses.push(course);
    });
  }

  // Deduplicate by learnusId
  const seen = new Set<string>();
  return courses.filter((c) => {
    if (seen.has(c.learnusId)) return false;
    seen.add(c.learnusId);
    return true;
  });
}

function parseCourseCard(card: Element): ScrapedCourse | null {
  const link = card.querySelector("a[href*='/course/view.php']") as HTMLAnchorElement;
  if (!link) return null;

  const name =
    card.querySelector(".coursename, .course-title, .multiline")?.textContent?.trim() ||
    link.textContent?.trim() ||
    "";
  const url = link.href;
  const learnusId = extractCourseId(url);

  if (!name || !learnusId) return null;

  // Try to extract semester from course name (e.g., "[2026-1] Data Structures")
  const semesterMatch = name.match(/\[(\d{4}-\d)\]/);
  const semester = semesterMatch ? semesterMatch[1] : "";

  return {
    learnusId,
    name: name.replace(/\[\d{4}-\d\]\s*/, "").trim(), // Remove semester prefix
    url,
    semester,
  };
}

function parseCourseLink(link: HTMLAnchorElement): ScrapedCourse | null {
  const url = link.href;
  const learnusId = extractCourseId(url);
  const name = link.textContent?.trim() || "";

  if (!name || !learnusId) return null;

  const semesterMatch = name.match(/\[(\d{4}-\d)\]/);
  const semester = semesterMatch ? semesterMatch[1] : "";

  return {
    learnusId,
    name: name.replace(/\[\d{4}-\d\]\s*/, "").trim(),
    url,
    semester,
  };
}

function extractCourseId(url: string): string {
  const match = url.match(/[?&]id=(\d+)/);
  return match ? match[1] : "";
}
