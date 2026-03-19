import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/anthropic";
import { buildIngestPrompt } from "@/lib/prompts/ingest";
import { extractTextFromPDF, cleanExtractedText } from "@/lib/pdf";
import { saveCourse, saveMaterial, getCourse } from "@/lib/store";
import type { Course, Material } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    let text = "";
    let filename = "pasted-text";
    let courseName = "";
    let courseId = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      courseId = (formData.get("courseId") as string) || "";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      filename = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.type === "application/pdf" || filename.endsWith(".pdf")) {
        text = await extractTextFromPDF(buffer);
      } else {
        text = buffer.toString("utf-8");
      }
    } else {
      const body = await request.json();
      text = body.text || "";
      courseName = body.name || "";
      courseId = body.courseId || "";
    }

    text = cleanExtractedText(text);

    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: "Not enough text content extracted. Try pasting text instead." },
        { status: 400 }
      );
    }

    // If adding to existing course
    if (courseId) {
      const existing = getCourse(courseId);
      if (existing) {
        const material: Material = {
          id: `m-${Date.now()}`,
          course_id: courseId,
          filename,
          file_type: filename.endsWith(".pdf") ? "pdf" : "text",
          content_text: text,
          storage_path: "",
          created_at: new Date().toISOString(),
        };
        saveMaterial(courseId, material);
        return NextResponse.json({ course: existing, material });
      }
    }

    // Parse with AI
    const ingestPrompt = buildIngestPrompt();
    const result = await generateResponse(ingestPrompt, [
      { role: "user", content: `Here is the document content:\n\n${text.slice(0, 15000)}` },
    ]);

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    const newCourseId = `c-${Date.now()}`;
    const course: Course = {
      id: newCourseId,
      user_id: "demo-user",
      name: parsed?.course_name || courseName || "Untitled Course",
      description: parsed?.description || null,
      semester: parsed?.semester || null,
      topics: parsed?.topics || [],
      weekly_schedule: parsed?.weekly_schedule || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCourse(course);

    // Save the material
    const material: Material = {
      id: `m-${Date.now()}`,
      course_id: newCourseId,
      filename,
      file_type: filename.endsWith(".pdf") ? "pdf" : "text",
      content_text: text,
      storage_path: "",
      created_at: new Date().toISOString(),
    };
    saveMaterial(newCourseId, material);

    return NextResponse.json({ course, material });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Failed to process document. Please try again." },
      { status: 500 }
    );
  }
}
