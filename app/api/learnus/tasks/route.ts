import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/anthropic";
import { buildHomeworkSolverPrompt } from "@/lib/learnus/prompts";
import { getCourseContext, getCourse } from "@/lib/store";
import {
  saveTask,
  getAllTasks,
  getTask,
  updateTask,
  deleteTask,
} from "@/lib/learnus/task-store";
import type { HomeworkTask } from "@/lib/learnus/types";

// GET - List all tasks
export async function GET() {
  const tasks = getAllTasks();
  return NextResponse.json({ tasks });
}

// POST - Create a task or solve one
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { courseId, courseName, title, description, dueDate, type } = body;

      const task: HomeworkTask = {
        id: `task-${Date.now()}`,
        courseId: courseId || "",
        courseName: courseName || "General",
        title,
        description: description || "",
        dueDate: dueDate || null,
        status: "pending",
        type: type || "assignment",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveTask(task);
      return NextResponse.json({ task });
    }

    if (action === "solve") {
      const { taskId, mode } = body;
      const task = getTask(taskId);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Update status to in_progress
      updateTask(taskId, { status: "in_progress" });

      // Get course context if available
      let courseContext = "";
      let courseName = task.courseName;
      if (task.courseId) {
        courseContext = getCourseContext(task.courseId);
        const course = getCourse(task.courseId);
        if (course) courseName = course.name;
      }

      const solveMode = mode || "solve";
      const prompt = buildHomeworkSolverPrompt(
        courseName,
        courseContext,
        `${task.title}\n\n${task.description}`,
        solveMode
      );

      const solution = await generateResponse(prompt, [
        {
          role: "user",
          content: solveMode === "solve"
            ? "Please complete this assignment for me. Provide a full, submission-ready solution."
            : "Help me understand how to approach this assignment. Guide me step by step.",
        },
      ]);

      const updated = updateTask(taskId, {
        status: "completed",
        solution,
      });

      return NextResponse.json({ task: updated, solution });
    }

    if (action === "update") {
      const { taskId, updates } = body;
      const updated = updateTask(taskId, updates);
      if (!updated) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ task: updated });
    }

    if (action === "delete") {
      const { taskId } = body;
      deleteTask(taskId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Task error:", error);
    return NextResponse.json(
      { error: "Failed to process task" },
      { status: 500 }
    );
  }
}
