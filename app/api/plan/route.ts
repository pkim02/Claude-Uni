import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/anthropic";
import { buildPlannerPrompt } from "@/lib/prompts/planner";
import { getCourse } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { courseId, examDate } = await request.json();

    const course = getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const today = new Date();
    const exam = new Date(examDate);
    const daysUntilExam = Math.max(
      1,
      Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    const topics = course.topics.map((t) => t.name);
    const weakTopics: string[] = []; // TODO: get from progress tracking

    const prompt = buildPlannerPrompt(
      course.name,
      topics,
      examDate,
      daysUntilExam,
      weakTopics
    );

    const result = await generateResponse(prompt, [
      { role: "user", content: "Generate the study plan now." },
    ]);

    // Parse JSON from response
    let plan;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      plan = null;
    }

    if (!plan) {
      return NextResponse.json(
        { error: "Failed to generate plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate study plan" },
      { status: 500 }
    );
  }
}
