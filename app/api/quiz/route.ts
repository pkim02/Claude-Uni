import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/anthropic";
import { buildQuizPrompt } from "@/lib/prompts/quiz-gen";
import { getCourse, getCourseContext } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { courseId, topic, difficulty } = await request.json();

    const course = getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const context = getCourseContext(courseId);
    const quizTopic = topic || course.topics.map((t) => t.name).join(", ") || course.name;
    const prompt = buildQuizPrompt(quizTopic, context, difficulty);

    const result = await generateResponse(prompt, [
      { role: "user", content: "Generate the quiz questions now." },
    ]);

    // Parse JSON from response
    let questions;
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      questions = [];
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Quiz error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
