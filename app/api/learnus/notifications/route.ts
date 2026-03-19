import { NextRequest, NextResponse } from "next/server";
import { runNotificationCheck } from "@/lib/learnus/notification-agent";
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  setSavedCredentials,
  getSavedCredentials,
} from "@/lib/learnus/notification-store";
import type { ScrapingProgress } from "@/lib/learnus/types";

// GET — List notifications + unread count
export async function GET() {
  const notifications = getAllNotifications();
  const unreadCount = getUnreadCount();
  const hasCredentials = getSavedCredentials() !== null;

  return NextResponse.json({ notifications, unreadCount, hasCredentials });
}

// POST — Check for new notifications or manage them
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Mark a single notification as read
    if (action === "read") {
      markAsRead(body.notificationId);
      return NextResponse.json({ success: true });
    }

    // Mark all as read
    if (action === "read_all") {
      markAllAsRead();
      return NextResponse.json({ success: true });
    }

    // Save credentials for future checks
    if (action === "save_credentials") {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json(
          { error: "Username and password required" },
          { status: 400 }
        );
      }
      setSavedCredentials(username, password);
      return NextResponse.json({ success: true });
    }

    // Check for new notifications (SSE stream)
    if (action === "check") {
      let username = body.username;
      let password = body.password;

      // Use saved credentials if not provided
      if (!username || !password) {
        const saved = getSavedCredentials();
        if (!saved) {
          return NextResponse.json(
            { error: "No credentials available. Please provide username and password or save credentials first." },
            { status: 400 }
          );
        }
        username = saved.username;
        password = saved.password;
      } else {
        // Save credentials for future quick checks
        setSavedCredentials(username, password);
      }

      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          function sendProgress(progress: ScrapingProgress) {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
              );
            } catch {
              // stream closed
            }
          }

          try {
            const result = await runNotificationCheck(
              { username, password },
              sendProgress
            );

            sendProgress({
              phase: "complete",
              message: `Found ${result.notifications.length} notification(s). ${result.tasksCreated} task(s) auto-created.`,
              timestamp: new Date().toISOString(),
            });

            controller.close();
          } catch (error) {
            sendProgress({
              phase: "error",
              message: `Check failed: ${(error as Error).message}`,
              timestamp: new Date().toISOString(),
            });
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json(
      { error: "Failed to process notification request" },
      { status: 500 }
    );
  }
}
