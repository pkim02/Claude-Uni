/**
 * Scrape grades from LearNUS grade page.
 */

import type { ScrapedGrade } from "@/shared/messages";

export function scrapeGrades(): ScrapedGrade[] {
  const grades: ScrapedGrade[] = [];

  // Strategy 1: Grade table (standard Moodle gradebook)
  const gradeRows = document.querySelectorAll(
    ".user-grade tr, #user-grade tr, .generaltable tr"
  );
  gradeRows.forEach((row) => {
    const grade = parseGradeRow(row);
    if (grade) grades.push(grade);
  });

  // Strategy 2: Grade items list
  const gradeItems = document.querySelectorAll(
    ".gradeitemheader, [data-itemtype]"
  );
  gradeItems.forEach((item) => {
    const grade = parseGradeItem(item);
    if (grade) grades.push(grade);
  });

  return grades;
}

function parseGradeRow(row: Element): ScrapedGrade | null {
  const cells = row.querySelectorAll("td, th");
  if (cells.length < 2) return null;

  // Skip header rows
  if (row.querySelector("th") && !row.querySelector("td")) return null;

  const assignmentName = cells[0]?.textContent?.trim() || "";
  const grade = cells[1]?.textContent?.trim() || "";

  if (!assignmentName || assignmentName === "Item") return null;

  // Try to find max grade and feedback
  const maxGrade = cells[2]?.textContent?.trim() || "";
  const feedback = cells[cells.length - 1]?.textContent?.trim() || "";

  return {
    assignmentName,
    grade,
    maxGrade,
    feedback: feedback !== grade ? feedback : "",
  };
}

function parseGradeItem(item: Element): ScrapedGrade | null {
  const name = item.textContent?.trim() || "";
  const gradeEl = item.parentElement?.querySelector(".gradevalue, .grade");
  const grade = gradeEl?.textContent?.trim() || "";

  if (!name || !grade) return null;

  return {
    assignmentName: name,
    grade,
    maxGrade: "",
    feedback: "",
  };
}
