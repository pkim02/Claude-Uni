/**
 * Background Service Worker
 * Central orchestrator for sync, AI queue, and auto-drafting.
 */

import { SyncManager } from "./sync-manager";
import { AIQueue } from "./ai-queue";

const syncManager = new SyncManager();
const aiQueue = new AIQueue();

// ── Message Handler ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    sendResponse({ error: (err as Error).message });
  });
  return true; // Keep channel open for async
});

async function handleMessage(
  message: { type: string; [key: string]: unknown },
  sender: chrome.runtime.MessageSender
) {
  switch (message.type) {
    // ── Sync ──
    case "SYNC_LEARNUS":
      return syncManager.startSync(message.force as boolean);

    case "SYNC_STATUS":
      return syncManager.getStatus();

    // ── AI Relay responses from content script ──
    case "AI_RESPONSE_CHUNK":
      aiQueue.handleChunk(
        message.id as string,
        message.text as string
      );
      return { ok: true };

    case "AI_RESPONSE_DONE":
      aiQueue.handleDone(
        message.id as string,
        message.fullText as string
      );
      return { ok: true };

    case "AI_RESPONSE_ERROR":
      aiQueue.handleError(
        message.id as string,
        message.error as string
      );
      return { ok: true };

    // ── AI Requests from UI ──
    case "AI_REQUEST":
      return aiQueue.enqueue({
        id: message.id as string,
        systemPrompt: message.systemPrompt as string,
        userPrompt: message.userPrompt as string,
      });

    case "AI_CANCEL":
      return aiQueue.cancel(message.id as string);

    // ── Auto-draft ──
    case "AUTO_DRAFT":
      return syncManager.autoDraft(message.assignmentId as string);

    // ── Data from LearNUS content script ──
    case "SCRAPED_COURSES":
      return syncManager.handleScrapedCourses(message.courses as never[]);

    case "SCRAPED_ASSIGNMENTS":
      return syncManager.handleScrapedAssignments(
        message.courseId as string,
        message.assignments as never[]
      );

    case "SCRAPED_MATERIALS":
      return syncManager.handleScrapedMaterials(
        message.courseId as string,
        message.materials as never[]
      );

    case "SCRAPED_ANNOUNCEMENTS":
      return syncManager.handleScrapedAnnouncements(
        message.courseId as string,
        message.announcements as never[]
      );

    // ── Settings ──
    case "SAVE_SETTINGS": {
      const { saveSettings } = await import("@/shared/storage");
      return saveSettings(message.settings as Record<string, unknown>);
    }

    default:
      console.warn("[Claude Uni] Unknown message type:", message.type);
      return { error: `Unknown message type: ${message.type}` };
  }
}

// ── Auto-sync on new tab ──

chrome.tabs.onCreated.addListener(async (tab) => {
  // Check if this is our new tab page being opened
  if (tab.pendingUrl?.includes("chrome://newtab") || tab.url?.includes("chrome://newtab")) {
    const { needsSync, getSettings } = await import("@/shared/storage");
    const settings = await getSettings();
    if (settings.autoSyncOnOpen && settings.learnusCredentials) {
      const shouldSync = await needsSync();
      if (shouldSync) {
        syncManager.startSync(false);
      }
    }
  }
});

// ── Badge for pending items ──

async function updateBadge() {
  const { getDraftReadyAssignments } = await import("@/shared/storage");
  const drafts = await getDraftReadyAssignments();
  const count = drafts.length;

  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
}

// Update badge periodically
setInterval(updateBadge, 60000);
updateBadge();

console.log("[Claude University] Background service worker initialized");
