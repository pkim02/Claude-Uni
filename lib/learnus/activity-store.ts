/**
 * In-memory store for unified activity feed.
 * Replaces the old notification store for the new dashboard.
 */
import type { Activity } from "./types";

const activities: Map<string, Activity> = new Map();

export function saveActivity(activity: Activity): void {
  activities.set(activity.id, activity);
}

export function getActivity(id: string): Activity | undefined {
  return activities.get(id);
}

export function getAllActivities(): Activity[] {
  return Array.from(activities.values()).sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  );
}

export function getUnreadActivities(): Activity[] {
  return getAllActivities().filter((a) => !a.read);
}

export function getUnreadActivityCount(): number {
  return getUnreadActivities().length;
}

export function markActivityRead(id: string): void {
  const activity = activities.get(id);
  if (activity) {
    activities.set(id, { ...activity, read: true });
  }
}

export function markAllActivitiesRead(): void {
  const ids = Array.from(activities.keys());
  for (const id of ids) {
    const activity = activities.get(id);
    if (activity) {
      activities.set(id, { ...activity, read: true });
    }
  }
}
