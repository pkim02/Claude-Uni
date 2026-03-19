/**
 * In-memory store for homework tasks.
 * In production, this would be backed by a database.
 */
import type { HomeworkTask } from "./types";

const tasks: Map<string, HomeworkTask> = new Map();

export function saveTask(task: HomeworkTask): void {
  tasks.set(task.id, task);
}

export function getTask(id: string): HomeworkTask | undefined {
  return tasks.get(id);
}

export function getAllTasks(): HomeworkTask[] {
  return Array.from(tasks.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getTasksByCourse(courseId: string): HomeworkTask[] {
  return getAllTasks().filter((t) => t.courseId === courseId);
}

export function updateTask(id: string, updates: Partial<HomeworkTask>): HomeworkTask | undefined {
  const task = tasks.get(id);
  if (!task) return undefined;
  const updated = { ...task, ...updates, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  return updated;
}

export function deleteTask(id: string): void {
  tasks.delete(id);
}
