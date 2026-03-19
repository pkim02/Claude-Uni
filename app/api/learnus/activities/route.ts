import { NextRequest, NextResponse } from "next/server";
import {
  getAllActivities,
  getUnreadActivityCount,
  markActivityRead,
  markAllActivitiesRead,
} from "@/lib/learnus/activity-store";

// GET - List activities and unread count
export async function GET() {
  const activities = getAllActivities();
  const unreadCount = getUnreadActivityCount();
  return NextResponse.json({ activities, unreadCount });
}

// POST - Mark read
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, activityId } = body;

  if (action === "read" && activityId) {
    markActivityRead(activityId);
    return NextResponse.json({ success: true });
  }

  if (action === "read_all") {
    markAllActivitiesRead();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
