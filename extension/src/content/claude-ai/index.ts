/**
 * Claude.ai Content Script
 * Injected on claude.ai — relays AI prompts through the student's existing Pro subscription.
 * No API key needed.
 */

import { createRelay } from "./relay";

const relay = createRelay();

// Listen for messages from background worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // Keep channel open for async
});

async function handleMessage(
  message: { type: string; [key: string]: unknown },
  sendResponse: (response: unknown) => void
) {
  switch (message.type) {
    case "AI_SEND_PROMPT": {
      const id = message.id as string;
      const prompt = message.prompt as string;
      try {
        await relay.sendPrompt(id, prompt);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ error: (err as Error).message });
      }
      break;
    }
    case "AI_ABORT": {
      relay.abort(message.id as string);
      sendResponse({ success: true });
      break;
    }
    case "AI_CHECK_READY": {
      sendResponse({ ready: relay.isReady() });
      break;
    }
    default:
      sendResponse({ error: `Unknown message type: ${message.type}` });
  }
}

console.log("[Claude University] claude.ai relay loaded");
