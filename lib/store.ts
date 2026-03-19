/**
 * Simple in-memory store for MVP.
 * In production, this would be backed by Supabase.
 */
import { Course, Material, Conversation, ChatMessage, Progress } from "./types";

interface Store {
  courses: Map<string, Course>;
  materials: Map<string, Material[]>;
  conversations: Map<string, Conversation>;
  progress: Map<string, Progress[]>;
}

const store: Store = {
  courses: new Map(),
  materials: new Map(),
  conversations: new Map(),
  progress: new Map(),
};

// Course operations
export function saveCourse(course: Course): void {
  store.courses.set(course.id, course);
}

export function getCourse(id: string): Course | undefined {
  return store.courses.get(id);
}

export function getAllCourses(): Course[] {
  return Array.from(store.courses.values());
}

export function deleteCourse(id: string): void {
  store.courses.delete(id);
  store.materials.delete(id);
}

// Material operations
export function saveMaterial(courseId: string, material: Material): void {
  const existing = store.materials.get(courseId) || [];
  existing.push(material);
  store.materials.set(courseId, existing);
}

export function getMaterials(courseId: string): Material[] {
  return store.materials.get(courseId) || [];
}

export function getCourseContext(courseId: string): string {
  const materials = getMaterials(courseId);
  const course = getCourse(courseId);

  let context = "";

  if (course) {
    context += `Course: ${course.name}\n`;
    if (course.description) context += `Description: ${course.description}\n`;
    context += "\nTopics:\n";
    course.topics.forEach((t) => {
      context += `- ${t.name}: ${t.description}\n`;
      if (t.subtopics.length > 0) {
        context += `  Subtopics: ${t.subtopics.join(", ")}\n`;
      }
    });
    context += "\nWeekly Schedule:\n";
    course.weekly_schedule.forEach((w) => {
      context += `Week ${w.week}: ${w.title}\n`;
      context += `  Topics: ${w.topics.join(", ")}\n`;
      context += `  Objectives: ${w.objectives.join("; ")}\n`;
    });
  }

  if (materials.length > 0) {
    context += "\n\nUploaded Materials:\n";
    materials.forEach((m) => {
      context += `\n--- ${m.filename} ---\n`;
      context += m.content_text.slice(0, 8000); // Limit per material
      context += "\n";
    });
  }

  return context;
}

// Conversation operations
export function saveConversation(conv: Conversation): void {
  store.conversations.set(conv.id, conv);
}

export function getConversation(id: string): Conversation | undefined {
  return store.conversations.get(id);
}

export function addMessage(conversationId: string, message: ChatMessage): void {
  const conv = store.conversations.get(conversationId);
  if (conv) {
    conv.messages.push(message);
    conv.updated_at = new Date().toISOString();
  }
}

// Progress operations
export function updateProgress(userId: string, courseId: string, topic: string, score: number): void {
  const key = `${userId}-${courseId}`;
  const existing = store.progress.get(key) || [];
  const topicProgress = existing.find((p) => p.topic === topic);

  if (topicProgress) {
    topicProgress.quiz_scores.push(score);
    topicProgress.mastery_level = Math.round(
      topicProgress.quiz_scores.reduce((a, b) => a + b, 0) / topicProgress.quiz_scores.length
    );
    topicProgress.last_studied = new Date().toISOString();
    topicProgress.times_reviewed++;
  } else {
    existing.push({
      id: `p-${Date.now()}`,
      user_id: userId,
      course_id: courseId,
      topic,
      mastery_level: score,
      quiz_scores: [score],
      last_studied: new Date().toISOString(),
      times_reviewed: 1,
    });
    store.progress.set(key, existing);
  }
}

export function getProgress(userId: string, courseId: string): Progress[] {
  return store.progress.get(`${userId}-${courseId}`) || [];
}
