/**
 * LearNUS Content Script
 * Injected on learnus.yonsei.ac.kr — scrapes DOM directly.
 * No Computer Use API needed.
 */

import { scrapeDashboardCourses } from "./courses";
import { scrapeAssignments } from "./assignments";
import { scrapeMaterials } from "./materials";
import { scrapeAnnouncements } from "./announcements";
import { scrapeGrades } from "./grades";

// Listen for messages from background worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message: { type: string; [key: string]: unknown }) {
  switch (message.type) {
    case "SCRAPE_PAGE": {
      const pageType = message.pageType as string;
      return scrapePage(pageType);
    }
    case "SCRAPE_COURSE_DETAIL": {
      const courseUrl = message.courseUrl as string;
      return scrapeCourseDetail(courseUrl);
    }
    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

async function scrapePage(pageType: string) {
  switch (pageType) {
    case "dashboard":
      return { type: "SCRAPED_COURSES", courses: scrapeDashboardCourses() };
    case "assignments":
      return {
        type: "SCRAPED_ASSIGNMENTS",
        courseId: getCourseIdFromUrl(),
        assignments: scrapeAssignments(),
      };
    case "materials":
      return {
        type: "SCRAPED_MATERIALS",
        courseId: getCourseIdFromUrl(),
        materials: scrapeMaterials(),
      };
    case "announcements":
      return {
        type: "SCRAPED_ANNOUNCEMENTS",
        courseId: getCourseIdFromUrl(),
        announcements: scrapeAnnouncements(),
      };
    case "grades":
      return {
        type: "SCRAPED_GRADES",
        courseId: getCourseIdFromUrl(),
        grades: scrapeGrades(),
      };
    default:
      return { error: `Unknown page type: ${pageType}` };
  }
}

async function scrapeCourseDetail(_courseUrl: string) {
  // Scrape everything from the current course page
  const assignments = scrapeAssignments();
  const materials = scrapeMaterials();
  const announcements = scrapeAnnouncements();

  return {
    type: "SCRAPED_COURSE_DETAIL",
    courseId: getCourseIdFromUrl(),
    assignments,
    materials,
    announcements,
  };
}

function getCourseIdFromUrl(): string {
  // LearNUS URLs: /course/view.php?id=12345
  const match = window.location.href.match(/[?&]id=(\d+)/);
  return match ? match[1] : "unknown";
}

// Auto-detect page type and notify background on load
function detectAndReport() {
  const url = window.location.href;

  if (url.includes("/my/") || url.includes("/dashboard")) {
    // Dashboard — auto-scrape courses
    const courses = scrapeDashboardCourses();
    chrome.runtime.sendMessage({
      type: "SCRAPED_COURSES",
      courses,
    });
  }
}

// Run on page load
if (document.readyState === "complete") {
  detectAndReport();
} else {
  window.addEventListener("load", detectAndReport);
}

console.log("[Claude University] LearNUS content script loaded");
