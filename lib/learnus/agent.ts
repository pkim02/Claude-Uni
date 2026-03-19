import { computerUseMessage } from "@/lib/anthropic";
import {
  launchBrowser,
  takeScreenshot,
  executeAction,
  closeBrowser,
  VIEWPORT,
  type ComputerAction,
} from "./browser";
import { buildScrapingPrompt } from "./prompts";
import type { ScrapingConfig, ScrapingResult, ProgressCallback } from "./types";

const MAX_ITERATIONS = 150;

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

function parseProgressMarkers(text: string, onProgress: ProgressCallback) {
  const phaseMatch = text.match(/\[PHASE:(\w+)\]/);
  if (phaseMatch) {
    const phase = phaseMatch[1] as "login" | "discovering" | "scraping";
    onProgress({
      phase,
      message: `Phase: ${phase}`,
      timestamp: new Date().toISOString(),
    });
  }

  const courseMatch = text.match(/\[COURSE:(.+?)\]/);
  if (courseMatch) {
    onProgress({
      phase: "scraping",
      message: `Scraping course: ${courseMatch[1]}`,
      currentCourse: courseMatch[1],
      timestamp: new Date().toISOString(),
    });
  }

  const downloadMatch = text.match(/\[DOWNLOADING:(.+?)\]/);
  if (downloadMatch) {
    onProgress({
      phase: "scraping",
      message: `Downloading: ${downloadMatch[1]}`,
      timestamp: new Date().toISOString(),
    });
  }

  const assignmentMatch = text.match(/\[ASSIGNMENT:(.+?)\]/);
  if (assignmentMatch) {
    onProgress({
      phase: "scraping",
      message: `Found assignment: ${assignmentMatch[1]}`,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function runScrapingAgent(
  config: ScrapingConfig,
  onProgress: ProgressCallback
): Promise<ScrapingResult> {
  const maxIter = config.maxIterations || MAX_ITERATIONS;
  const errors: string[] = [];
  let filesDownloaded = 0;

  onProgress({
    phase: "login",
    message: "Launching browser...",
    timestamp: new Date().toISOString(),
  });

  const { browser, page } = await launchBrowser(config.downloadDir);

  try {
    // Navigate to LearNUS
    await page.goto("https://learnus.yonsei.ac.kr", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    onProgress({
      phase: "login",
      message: "Navigated to LearNUS. Starting agent...",
      timestamp: new Date().toISOString(),
    });

    // Take initial screenshot
    let screenshotBase64 = await takeScreenshot(page);

    // Build conversation history
    const systemPrompt = buildScrapingPrompt(config.username);

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `I need you to log into LearNUS and download all my course materials. My username is "${config.username}". When you click the password field, type my password. Here is the current state of the browser:`,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: screenshotBase64,
            },
          },
        ],
      },
    ];

    // Agent loop
    for (let i = 0; i < maxIter; i++) {
      const response = await computerUseMessage(systemPrompt, messages);

      // Process response content blocks
      const assistantContent: ContentBlock[] = response.content as ContentBlock[];
      messages.push({ role: "assistant", content: assistantContent });

      let isDone = false;
      const toolResults: any[] = [];

      for (const block of assistantContent) {
        if (block.type === "text" && block.text) {
          // Check for progress markers
          parseProgressMarkers(block.text, onProgress);

          // Check for completion
          if (block.text.includes("[DONE]")) {
            isDone = true;
          }

          // Count downloads mentioned
          const downloads = block.text.match(/\[DOWNLOADING:/g);
          if (downloads) {
            filesDownloaded += downloads.length;
          }
        }

        if (block.type === "tool_use" && block.name === "computer") {
          const action = block.input as unknown as ComputerAction;

          try {
            // Special handling: if typing password
            if (action.action === "type" && action.text === config.username) {
              // Username is fine to type as-is
              await executeAction(page, action);
            } else if (action.action === "type") {
              // Check if this might be a password field
              const activeEl = await page.evaluate(() => {
                const el = document.activeElement as HTMLInputElement;
                return el?.type || "";
              });
              if (activeEl === "password") {
                // Type the actual password
                await executeAction(page, { ...action, text: config.password });
              } else {
                await executeAction(page, action);
              }
            } else {
              await executeAction(page, action);
            }

            // Wait a bit for page to load after clicks
            if (action.action === "click") {
              await new Promise((r) => setTimeout(r, 1500));
            }
          } catch (err) {
            errors.push(`Action failed at step ${i}: ${(err as Error).message}`);
          }

          // Take new screenshot
          screenshotBase64 = await takeScreenshot(page);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: screenshotBase64,
                },
              },
            ],
          });
        }
      }

      if (toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults });
      }

      if (isDone || response.stop_reason === "end_turn") {
        // Check if truly done or if Claude just wants to say something
        const hasToolUse = assistantContent.some((b) => b.type === "tool_use");
        if (!hasToolUse || isDone) {
          break;
        }
      }

      onProgress({
        phase: "scraping",
        message: `Agent step ${i + 1}/${maxIter}`,
        filesDownloaded,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      coursesCreated: [],
      filesDownloaded,
      errors,
    };
  } catch (err) {
    onProgress({
      phase: "error",
      message: `Scraping failed: ${(err as Error).message}`,
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      coursesCreated: [],
      filesDownloaded: 0,
      errors: [(err as Error).message],
    };
  } finally {
    await closeBrowser(browser);
  }
}
