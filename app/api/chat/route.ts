import { NextRequest } from "next/server";
import { streamChat } from "@/lib/anthropic";
import { buildTutorPrompt } from "@/lib/prompts/tutor";
import { getCourse, getCourseContext } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { courseId, messages } = await request.json();

    const course = getCourse(courseId);
    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const context = getCourseContext(courseId);
    const systemPrompt = buildTutorPrompt(course.name, context);

    const stream = await streamChat(systemPrompt, messages);

    // Create SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
