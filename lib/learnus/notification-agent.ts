import { computerUseMessage } from "@/lib/anthropic";
import {
  launchBrowser,
  takeScreenshot,
  executeAction,
  closeBrowser,
  type ComputerAction,
} from "./browser";
import { buildNotificationCheckPrompt } from "./prompts";
import { saveNotification } from "./notification-store";
import { saveTask } from "./task-store";
import { getAllCourses } from "@/lib/store";
import type {
  NotificationCheckConfig,
  NotificationCheckResult,
  LearnUSNotification,
  HomeworkTask,
  ProgressCallback,
} from "./types";
import os from "os";
import path from "path";

const MAX_NOTIFICATION_ITERATIONS = 40;

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

function parseNotifications(text: string): LearnUSNotification[] {
  const results: LearnUSNotification[] = [];
  const regex = /\[NOTIF:(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [, type, courseName, title, description, dueDate] = match;
    results.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type as LearnUSNotification["type"],
      courseName: courseName.trim(),
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate.trim() === "none" ? null : dueDate.trim(),
      read: false,
      autoTaskCreated: false,
      detectedAt: new Date().toISOString(),
    });
  }

  return results;
}

function autoCreateTaskFromNotification(notif: LearnUSNotification): HomeworkTask | null {
  // Only auto-create tasks for assignments and quizzes
  if (notif.type !== "assignment" && notif.type !== "quiz") return null;

  // Try to match to an existing course
  const courses = getAllCourses();
  const matchedCourse = courses.find(
    (c) =>
      c.name.toLowerCase().includes(notif.courseName.toLowerCase()) ||
      notif.courseName.toLowerCase().includes(c.name.toLowerCase())
  );

  const task: HomeworkTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    courseId: matchedCourse?.id || "",
    courseName: notif.courseName,
    title: notif.title,
    description: notif.description,
    dueDate: notif.dueDate,
    status: "pending",
    type: notif.type === "quiz" ? "quiz" : "assignment",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveTask(task);
  return task;
}

export async function runNotificationCheck(
  config: NotificationCheckConfig,
  onProgress: ProgressCallback
): Promise<NotificationCheckResult> {
  const maxIter = config.maxIterations || MAX_NOTIFICATION_ITERATIONS;
  const errors: string[] = [];
  const allNotifications: LearnUSNotification[] = [];
  let tasksCreated = 0;

  const downloadDir = path.join(os.tmpdir(), `learnus-notif-${Date.now()}`);

  onProgress({
    phase: "login",
    message: "Launching browser for notification check...",
    timestamp: new Date().toISOString(),
  });

  const { browser, page } = await launchBrowser(downloadDir);

  try {
    await page.goto("https://learnus.yonsei.ac.kr", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    let screenshotBase64 = await takeScreenshot(page);
    const systemPrompt = buildNotificationCheckPrompt(config.username);

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Quick check: log into LearNUS and check my notifications for any updates. My username is "${config.username}". Here is the browser:`,
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

    for (let i = 0; i < maxIter; i++) {
      const response = await computerUseMessage(systemPrompt, messages);
      const assistantContent: ContentBlock[] = response.content as ContentBlock[];
      messages.push({ role: "assistant", content: assistantContent });

      let isDone = false;
      const toolResults: any[] = [];

      for (const block of assistantContent) {
        if (block.type === "text" && block.text) {
          // Parse notification markers
          const newNotifs = parseNotifications(block.text);
          for (const notif of newNotifs) {
            saveNotification(notif);
            allNotifications.push(notif);

            onProgress({
              phase: "discovering",
              message: `Found: [${notif.type}] ${notif.courseName} — ${notif.title}`,
              timestamp: new Date().toISOString(),
            });

            // Auto-create task for assignments/quizzes
            const task = autoCreateTaskFromNotification(notif);
            if (task) {
              notif.autoTaskCreated = true;
              saveNotification(notif);
              tasksCreated++;
              onProgress({
                phase: "discovering",
                message: `Auto-created task: ${task.title}`,
                timestamp: new Date().toISOString(),
              });
            }
          }

          if (block.text.includes("[DONE]")) {
            isDone = true;
          }
        }

        if (block.type === "tool_use" && block.name === "computer") {
          const action = block.input as unknown as ComputerAction;

          try {
            if (action.action === "type") {
              const activeEl = await page.evaluate(() => {
                const el = document.activeElement as HTMLInputElement;
                return el?.type || "";
              });
              if (activeEl === "password") {
                await executeAction(page, { ...action, text: config.password });
              } else {
                await executeAction(page, action);
              }
            } else {
              await executeAction(page, action);
            }

            if (action.action === "click") {
              await new Promise((r) => setTimeout(r, 1500));
            }
          } catch (err) {
            errors.push(`Step ${i}: ${(err as Error).message}`);
          }

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
        const hasToolUse = assistantContent.some((b) => b.type === "tool_use");
        if (!hasToolUse || isDone) break;
      }

      onProgress({
        phase: "discovering",
        message: `Checking notifications... step ${i + 1}`,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      notifications: allNotifications,
      tasksCreated,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      notifications: [],
      tasksCreated: 0,
      errors: [(err as Error).message],
    };
  } finally {
    await closeBrowser(browser);
  }
}
