import fs from "fs";
import path from "path";
import { generateResponse } from "@/lib/anthropic";
import { buildIngestPrompt } from "@/lib/prompts/ingest";
import { extractTextFromPDF, cleanExtractedText } from "@/lib/pdf";
import { saveCourse, saveMaterial } from "@/lib/store";
import type { Course, Material } from "@/lib/types";
import type { ProgressCallback } from "./types";

const SUPPORTED_EXTENSIONS = [".pdf", ".txt", ".pptx", ".docx", ".doc", ".ppt", ".hwp"];

export async function ingestScrapedFiles(
  downloadDir: string,
  onProgress: ProgressCallback
): Promise<{ coursesCreated: string[]; filesProcessed: number }> {
  const coursesCreated: string[] = [];
  let filesProcessed = 0;

  // Scan download directory for files
  if (!fs.existsSync(downloadDir)) {
    return { coursesCreated, filesProcessed };
  }

  const files = fs.readdirSync(downloadDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext) || ext === "";
  });

  if (files.length === 0) {
    onProgress({
      phase: "ingesting",
      message: "No downloadable files found. Courses may use online-only content.",
      timestamp: new Date().toISOString(),
    });
    return { coursesCreated, filesProcessed };
  }

  onProgress({
    phase: "ingesting",
    message: `Processing ${files.length} downloaded files...`,
    timestamp: new Date().toISOString(),
  });

  // Group files by potential course (using filename patterns)
  // For now, batch all files and let Claude figure out the course structure
  const allTexts: { filename: string; text: string }[] = [];

  for (const file of files) {
    const filePath = path.join(downloadDir, file);
    const ext = path.extname(file).toLowerCase();
    let text = "";

    try {
      if (ext === ".pdf") {
        const buffer = fs.readFileSync(filePath);
        text = await extractTextFromPDF(buffer);
      } else if (ext === ".txt" || ext === ".doc" || ext === ".docx") {
        text = fs.readFileSync(filePath, "utf-8");
      } else {
        // For binary formats like pptx, hwp — store filename only
        text = `[Binary file: ${file}]`;
      }

      text = cleanExtractedText(text);
      if (text.length > 10) {
        allTexts.push({ filename: file, text });
        filesProcessed++;
      }
    } catch (err) {
      console.error(`Failed to process ${file}:`, err);
    }
  }

  if (allTexts.length === 0) {
    return { coursesCreated, filesProcessed };
  }

  // Create a combined summary for Claude to analyze and structure into courses
  const combinedContent = allTexts
    .map((t) => `--- ${t.filename} ---\n${t.text.slice(0, 5000)}`)
    .join("\n\n");

  onProgress({
    phase: "ingesting",
    message: "Analyzing materials with AI to structure courses...",
    timestamp: new Date().toISOString(),
  });

  try {
    const ingestPrompt = buildIngestPrompt();
    const result = await generateResponse(ingestPrompt, [
      {
        role: "user",
        content: `Here are course materials scraped from LearNUS (Yonsei University LMS). Analyze them and create a structured course:\n\n${combinedContent.slice(0, 15000)}`,
      },
    ]);

    let parsed;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    const courseId = `c-${Date.now()}`;
    const course: Course = {
      id: courseId,
      user_id: "demo-user",
      name: parsed?.course_name || "LearNUS Import",
      description: parsed?.description || "Imported from LearNUS",
      semester: parsed?.semester || null,
      topics: parsed?.topics || [],
      weekly_schedule: parsed?.weekly_schedule || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCourse(course);
    coursesCreated.push(courseId);

    // Save each file as a material
    for (const item of allTexts) {
      const ext = path.extname(item.filename).toLowerCase();
      const material: Material = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        course_id: courseId,
        filename: item.filename,
        file_type: ext === ".pdf" ? "pdf" : "text",
        content_text: item.text,
        storage_path: "",
        created_at: new Date().toISOString(),
      };
      saveMaterial(courseId, material);
    }

    onProgress({
      phase: "ingesting",
      message: `Created course: ${course.name} with ${allTexts.length} materials`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Ingestion error:", err);
  }

  return { coursesCreated, filesProcessed };
}
