/**
 * Scrape course materials/resources from a LearNUS course page.
 */

import type { ScrapedMaterial } from "@/shared/messages";

export function scrapeMaterials(): ScrapedMaterial[] {
  const materials: ScrapedMaterial[] = [];

  // Strategy 1: Resource activities (files)
  const resources = document.querySelectorAll(
    '.activity.resource, .activity.modtype_resource, a[href*="/mod/resource/view.php"]'
  );
  resources.forEach((el) => {
    const material = parseResourceActivity(el);
    if (material) materials.push(material);
  });

  // Strategy 2: Folder activities
  const folders = document.querySelectorAll(
    '.activity.folder, .activity.modtype_folder, a[href*="/mod/folder/view.php"]'
  );
  folders.forEach((el) => {
    const material = parseFolderActivity(el);
    if (material) materials.push(material);
  });

  // Strategy 3: Direct file links (pluginfile.php)
  const fileLinks = document.querySelectorAll(
    'a[href*="/pluginfile.php"]'
  );
  fileLinks.forEach((link) => {
    const material = parseFileLink(link as HTMLAnchorElement);
    if (material) materials.push(material);
  });

  // Strategy 4: URL activities (external links to materials)
  const urlActivities = document.querySelectorAll(
    '.activity.url, .activity.modtype_url'
  );
  urlActivities.forEach((el) => {
    const material = parseUrlActivity(el);
    if (material) materials.push(material);
  });

  // Deduplicate by URL
  const seen = new Set<string>();
  return materials.filter((m) => {
    if (seen.has(m.url)) return false;
    seen.add(m.url);
    return true;
  });
}

function parseResourceActivity(el: Element): ScrapedMaterial | null {
  const link = (
    el instanceof HTMLAnchorElement
      ? el
      : el.querySelector('a[href*="/mod/resource/"], a[href*="/pluginfile.php"]')
  ) as HTMLAnchorElement;
  if (!link) return null;

  const title = el.querySelector(".instancename, .aalink")?.textContent?.trim() ||
    link.textContent?.trim() || "";
  const url = link.href;
  const section = findSectionName(el);
  const fileType = guessFileType(title, url);

  return { title, url, fileType, section };
}

function parseFolderActivity(el: Element): ScrapedMaterial | null {
  const link = (
    el instanceof HTMLAnchorElement
      ? el
      : el.querySelector('a[href*="/mod/folder/"]')
  ) as HTMLAnchorElement;
  if (!link) return null;

  const title = el.querySelector(".instancename, .aalink")?.textContent?.trim() ||
    link.textContent?.trim() || "";
  return { title, url: link.href, fileType: "folder", section: findSectionName(el) };
}

function parseFileLink(link: HTMLAnchorElement): ScrapedMaterial | null {
  const title = link.textContent?.trim() || decodeURIComponent(link.href.split("/").pop() || "");
  if (!title) return null;

  return {
    title,
    url: link.href,
    fileType: guessFileType(title, link.href),
    section: findSectionName(link),
  };
}

function parseUrlActivity(el: Element): ScrapedMaterial | null {
  const link = el.querySelector("a") as HTMLAnchorElement;
  if (!link) return null;

  const title = el.querySelector(".instancename")?.textContent?.trim() ||
    link.textContent?.trim() || "";
  return { title, url: link.href, fileType: "link", section: findSectionName(el) };
}

function findSectionName(el: Element): string {
  // Walk up to find the section header
  let current: Element | null = el;
  while (current) {
    const section = current.closest(".section, .course-section, [data-region='section']");
    if (section) {
      const header = section.querySelector(
        ".sectionname, .section-title, h3"
      );
      return header?.textContent?.trim() || "";
    }
    current = current.parentElement;
  }
  return "";
}

function guessFileType(title: string, url: string): string {
  const combined = (title + " " + url).toLowerCase();
  if (combined.includes(".pdf")) return "pdf";
  if (combined.includes(".ppt") || combined.includes(".pptx")) return "pptx";
  if (combined.includes(".doc") || combined.includes(".docx")) return "docx";
  if (combined.includes(".hwp")) return "hwp";
  if (combined.includes(".xls") || combined.includes(".xlsx")) return "xlsx";
  if (combined.includes(".zip") || combined.includes(".rar")) return "archive";
  if (combined.includes(".mp4") || combined.includes(".avi")) return "video";
  return "other";
}
