/**
 * AI Queue — manages AI requests through the claude.ai relay.
 * Ensures only one request is processed at a time.
 */

interface AIRequest {
  id: string;
  systemPrompt: string;
  userPrompt: string;
  resolve?: (text: string) => void;
  reject?: (error: Error) => void;
}

interface ActiveAI {
  request: AIRequest;
  chunks: string[];
  fullText: string;
}

export class AIQueue {
  private queue: AIRequest[] = [];
  private active: ActiveAI | null = null;
  private claudeTabId: number | null = null;

  async enqueue(request: AIRequest): Promise<{ queued: boolean }> {
    this.queue.push(request);
    this.processNext();
    return { queued: true };
  }

  cancel(id: string): { cancelled: boolean } {
    // Remove from queue
    this.queue = this.queue.filter((r) => r.id !== id);

    // If active, abort it
    if (this.active?.request.id === id) {
      this.sendToRelay({ type: "AI_ABORT", id });
      this.active = null;
      this.processNext();
    }

    return { cancelled: true };
  }

  // ── Response handlers (called from service worker message handler) ──

  handleChunk(id: string, text: string) {
    if (this.active?.request.id === id) {
      this.active.chunks.push(text);

      // Forward to UI
      chrome.runtime.sendMessage({
        type: "AI_CHUNK",
        id,
        text,
      }).catch(() => {});
    }
  }

  async handleDone(id: string, fullText: string) {
    if (this.active?.request.id === id) {
      this.active.fullText = fullText;

      // Forward to UI
      chrome.runtime.sendMessage({
        type: "AI_DONE",
        id,
        fullText,
      }).catch(() => {});

      // Check if this was a draft request
      await this.checkDraftCompletion(id, fullText);

      this.active = null;
      this.processNext();
    }
  }

  handleError(id: string, error: string) {
    if (this.active?.request.id === id) {
      // Forward to UI
      chrome.runtime.sendMessage({
        type: "AI_ERROR",
        id,
        error,
      }).catch(() => {});

      this.active = null;
      this.processNext();
    }
  }

  // ── Internal ──

  private async processNext() {
    if (this.active || this.queue.length === 0) return;

    const request = this.queue.shift()!;
    this.active = { request, chunks: [], fullText: "" };

    try {
      // Ensure claude.ai tab is open
      await this.ensureClaudeTab();

      // Build the full prompt (combine system + user for relay)
      const fullPrompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n---\n\n${request.userPrompt}`
        : request.userPrompt;

      // Send to content script
      await this.sendToRelay({
        type: "AI_SEND_PROMPT",
        id: request.id,
        prompt: fullPrompt,
      });
    } catch (err) {
      this.handleError(request.id, (err as Error).message);
    }
  }

  private async ensureClaudeTab(): Promise<void> {
    // Check if existing tab is still valid
    if (this.claudeTabId) {
      try {
        const tab = await chrome.tabs.get(this.claudeTabId);
        if (tab && tab.url?.includes("claude.ai")) return;
      } catch {
        this.claudeTabId = null;
      }
    }

    // Look for existing claude.ai tab
    const tabs = await chrome.tabs.query({ url: "*://claude.ai/*" });
    if (tabs.length > 0 && tabs[0].id) {
      this.claudeTabId = tabs[0].id;
      return;
    }

    // Open new claude.ai tab
    const tab = await chrome.tabs.create({
      url: "https://claude.ai/new",
      active: false,
    });
    this.claudeTabId = tab.id!;

    // Wait for the page to load
    await new Promise<void>((resolve) => {
      const listener = (
        tabId: number,
        info: chrome.tabs.TabChangeInfo
      ) => {
        if (tabId === this.claudeTabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Extra wait for React to initialize
    await new Promise((r) => setTimeout(r, 2000));
  }

  private async sendToRelay(message: unknown): Promise<void> {
    if (!this.claudeTabId) throw new Error("No claude.ai tab");
    await chrome.tabs.sendMessage(this.claudeTabId, message);
  }

  private async checkDraftCompletion(requestId: string, fullText: string) {
    // Check if this AI request was for auto-drafting
    const key = `draft_request_${requestId}`;
    const result = await chrome.storage.local.get(key);
    const assignmentId = result[key];

    if (assignmentId) {
      // Update the assignment with the draft
      const { updateAssignment } = await import("@/shared/storage");
      await updateAssignment(assignmentId, {
        status: "draft_ready",
        draftSolution: fullText,
        draftedAt: new Date().toISOString(),
      });

      // Clean up mapping
      await chrome.storage.local.remove(key);

      // Notify UI
      chrome.runtime.sendMessage({
        type: "DRAFT_COMPLETE",
        assignmentId,
        draft: fullText,
      }).catch(() => {});

      chrome.runtime.sendMessage({ type: "DATA_UPDATED" }).catch(() => {});
    }
  }
}
