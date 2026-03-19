/**
 * In-memory store for LearNUS notifications.
 */
import type { LearnUSNotification } from "./types";

const notifications: Map<string, LearnUSNotification> = new Map();

// Stored credentials for re-checking (only in memory, never persisted)
let savedCredentials: { username: string; password: string } | null = null;

export function saveNotification(notif: LearnUSNotification): void {
  notifications.set(notif.id, notif);
}

export function getNotification(id: string): LearnUSNotification | undefined {
  return notifications.get(id);
}

export function getAllNotifications(): LearnUSNotification[] {
  return Array.from(notifications.values()).sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  );
}

export function getUnreadNotifications(): LearnUSNotification[] {
  return getAllNotifications().filter((n) => !n.read);
}

export function getUnreadCount(): number {
  return getUnreadNotifications().length;
}

export function markAsRead(id: string): void {
  const notif = notifications.get(id);
  if (notif) {
    notifications.set(id, { ...notif, read: true });
  }
}

export function markAllAsRead(): void {
  const ids = Array.from(notifications.keys());
  for (const id of ids) {
    const notif = notifications.get(id);
    if (notif) {
      notifications.set(id, { ...notif, read: true });
    }
  }
}

export function setSavedCredentials(username: string, password: string): void {
  savedCredentials = { username, password };
}

export function getSavedCredentials(): { username: string; password: string } | null {
  return savedCredentials;
}

export function clearSavedCredentials(): void {
  savedCredentials = null;
}
