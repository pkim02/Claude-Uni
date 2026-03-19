/**
 * AI Relay — sends prompts to claude.ai and reads responses via DOM manipulation.
 *
 * How it works:
 * 1. Finds the chat input (ProseMirror editor)
 * 2. Sets the prompt text
 * 3. Clicks send
 * 4. Observes the response container with MutationObserver
 * 5. Streams chunks back to background worker
 * 6. Sends done signal when streaming stops
 */

interface ActiveRequest {
  id: string;
  observer: MutationObserver | null;
  aborted: boolean;
  lastText: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

export function createRelay() {
  const activeRequests = new Map<string, ActiveRequest>();

  function isReady(): boolean {
    // Check if we're on claude.ai and the chat interface is available
    const input = findChatInput();
    return input !== null;
  }

  async function sendPrompt(id: string, prompt: string): Promise<void> {
    const request: ActiveRequest = {
      id,
      observer: null,
      aborted: false,
      lastText: "",
      idleTimer: null,
    };
    activeRequests.set(id, request);

    try {
      // Step 1: Navigate to new chat if needed
      await ensureNewChat();

      // Step 2: Wait for input to be ready
      const input = await waitForElement(
        '[contenteditable="true"], textarea[placeholder], .ProseMirror',
        5000
      );
      if (!input) throw new Error("Chat input not found");

      // Step 3: Set the prompt text
      await setInputText(input, prompt);

      // Step 4: Click send button
      await clickSend();

      // Step 5: Observe the response
      await observeResponse(request);
    } catch (err) {
      activeRequests.delete(id);
      chrome.runtime.sendMessage({
        type: "AI_RESPONSE_ERROR",
        id,
        error: (err as Error).message,
      });
    }
  }

  function abort(id: string): void {
    const request = activeRequests.get(id);
    if (request) {
      request.aborted = true;
      request.observer?.disconnect();
      if (request.idleTimer) clearTimeout(request.idleTimer);
      activeRequests.delete(id);

      // Try to click stop button
      const stopBtn = document.querySelector(
        'button[aria-label="Stop"], button[aria-label="Stop generating"]'
      );
      if (stopBtn) (stopBtn as HTMLElement).click();
    }
  }

  async function ensureNewChat(): Promise<void> {
    // Check if there's already a clean chat (no messages)
    const messages = document.querySelectorAll(
      '[data-testid*="message"], .message-content, [class*="Message"]'
    );
    if (messages.length > 0) {
      // Navigate to new chat
      const newChatBtn = document.querySelector(
        'a[href="/new"], button[aria-label="New chat"], [data-testid="new-chat-button"]'
      );
      if (newChatBtn) {
        (newChatBtn as HTMLElement).click();
        await sleep(1000);
      } else {
        // Direct navigation
        window.location.href = "https://claude.ai/new";
        await sleep(2000);
      }
    }
  }

  async function setInputText(input: Element, text: string): Promise<void> {
    // Focus the input
    (input as HTMLElement).focus();
    await sleep(100);

    if (input.classList.contains("ProseMirror") || input.getAttribute("contenteditable")) {
      // ProseMirror editor — set innerHTML with paragraphs
      const paragraphs = text.split("\n").map((line) => {
        if (line.trim() === "") return "<p><br></p>";
        return `<p>${escapeHtml(line)}</p>`;
      });
      input.innerHTML = paragraphs.join("");

      // Dispatch input event to trigger ProseMirror's internal state update
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (input instanceof HTMLTextAreaElement) {
      // Regular textarea
      const nativeSet = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      nativeSet?.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    await sleep(200);
  }

  async function clickSend(): Promise<void> {
    // Try multiple selectors for the send button
    const selectors = [
      'button[aria-label="Send Message"]',
      'button[aria-label="Send"]',
      'button[data-testid="send-button"]',
      'button[type="submit"]',
      // Fallback: find button near the input
      'form button:last-of-type',
    ];

    for (const selector of selectors) {
      const btn = document.querySelector(selector) as HTMLElement;
      if (btn && !btn.hasAttribute("disabled")) {
        btn.click();
        await sleep(500);
        return;
      }
    }

    // Last resort: press Enter
    const input = findChatInput();
    if (input) {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
      );
    }
  }

  async function observeResponse(request: ActiveRequest): Promise<void> {
    // Wait for response to start appearing
    await sleep(1000);

    // Find the response container — look for the last assistant message
    const findResponseContainer = (): Element | null => {
      // Claude.ai response containers
      const selectors = [
        '[data-testid="assistant-message"]:last-of-type',
        '[class*="assistant"]:last-of-type .markdown',
        '[class*="Response"]:last-of-type',
        ".prose:last-of-type",
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }

      // Fallback: find the last message-like container
      const allMessages = document.querySelectorAll(
        '[data-testid*="message"], [class*="message"], [class*="Message"]'
      );
      return allMessages[allMessages.length - 1] || null;
    };

    const container = await waitForDynamic(findResponseContainer, 10000);
    if (!container) {
      throw new Error("Response container not found");
    }

    // Observe mutations on the response container
    const observer = new MutationObserver(() => {
      if (request.aborted) return;

      const currentText = container.textContent || "";
      if (currentText !== request.lastText) {
        const newChunk = currentText.slice(request.lastText.length);
        request.lastText = currentText;

        // Send chunk to background
        chrome.runtime.sendMessage({
          type: "AI_RESPONSE_CHUNK",
          id: request.id,
          text: newChunk,
        });
      }

      // Reset idle timer — if no mutations for 3 seconds, consider done
      if (request.idleTimer) clearTimeout(request.idleTimer);
      request.idleTimer = setTimeout(() => {
        finishResponse(request, container);
      }, 3000);
    });

    request.observer = observer;
    observer.observe(container, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    // Also set an initial idle timer
    request.idleTimer = setTimeout(() => {
      finishResponse(request, container);
    }, 3000);
  }

  function finishResponse(request: ActiveRequest, container: Element): void {
    if (request.aborted) return;

    request.observer?.disconnect();
    activeRequests.delete(request.id);

    const fullText = container.textContent || "";
    chrome.runtime.sendMessage({
      type: "AI_RESPONSE_DONE",
      id: request.id,
      fullText,
    });
  }

  function findChatInput(): Element | null {
    const selectors = [
      '.ProseMirror[contenteditable="true"]',
      'textarea[placeholder]',
      '[contenteditable="true"][data-placeholder]',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  return { isReady, sendPrompt, abort };
}

// ── Utilities ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function waitForElement(
  selector: string,
  timeout: number
): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await sleep(200);
  }
  return null;
}

async function waitForDynamic(
  finder: () => Element | null,
  timeout: number
): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = finder();
    if (el) return el;
    await sleep(300);
  }
  return null;
}
