/**
 * Scrape announcements from a LearNUS course page.
 */

import type { ScrapedAnnouncement } from "@/shared/messages";

export function scrapeAnnouncements(): ScrapedAnnouncement[] {
  const announcements: ScrapedAnnouncement[] = [];

  // Strategy 1: Forum posts (announcements are usually a forum in Moodle)
  const forumPosts = document.querySelectorAll(
    ".forumpost, .discussion, .forum-post"
  );
  forumPosts.forEach((post) => {
    const announcement = parseForumPost(post);
    if (announcement) announcements.push(announcement);
  });

  // Strategy 2: Announcement block
  const announcementItems = document.querySelectorAll(
    '.block_news_items .post, [data-region="announcement"]'
  );
  announcementItems.forEach((item) => {
    const announcement = parseAnnouncementItem(item);
    if (announcement) announcements.push(announcement);
  });

  // Strategy 3: Forum activity links (for discovery)
  const forumLinks = document.querySelectorAll(
    '.activity.forum a[href*="/mod/forum/"], a[href*="/mod/forum/view.php"]'
  );
  forumLinks.forEach((link) => {
    const title = link.textContent?.trim() || "";
    if (
      title.includes("공지") ||
      title.includes("announcement") ||
      title.toLowerCase().includes("notice")
    ) {
      announcements.push({
        title,
        content: "",
        author: "",
        date: "",
      });
    }
  });

  return announcements;
}

function parseForumPost(post: Element): ScrapedAnnouncement | null {
  const title =
    post.querySelector(".subject, .discussion-name, h3, h4")?.textContent?.trim() || "";
  const content =
    post.querySelector(".posting, .post-content-container, .text_to_html")?.textContent?.trim() || "";
  const author =
    post.querySelector(".author, .by, .username")?.textContent?.trim() || "";
  const date =
    post.querySelector("time, .date, .discussionsubscription")?.textContent?.trim() || "";

  if (!title) return null;
  return { title, content, author, date };
}

function parseAnnouncementItem(item: Element): ScrapedAnnouncement | null {
  const title = item.querySelector("a, h4, .subject")?.textContent?.trim() || "";
  const content = item.querySelector(".text_to_html, .posting, p")?.textContent?.trim() || "";
  const date = item.querySelector("time, .date, small")?.textContent?.trim() || "";

  if (!title) return null;
  return { title, content, author: "", date };
}
