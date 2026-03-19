import { NextRequest } from "next/server";
import os from "os";
import path from "path";
import fs from "fs";
import { runScrapingAgent } from "@/lib/learnus/agent";
import { ingestScrapedFiles } from "@/lib/learnus/ingest-scraped";
import type { ScrapingProgress } from "@/lib/learnus/types";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create temp download directory
    const downloadDir = path.join(os.tmpdir(), `learnus-${Date.now()}`);
    fs.mkdirSync(downloadDir, { recursive: true });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        function sendProgress(progress: ScrapingProgress) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
            );
          } catch {
            // stream may be closed
          }
        }

        try {
          // Phase 1: Scrape LearNUS
          const scrapeResult = await runScrapingAgent(
            { username, password, downloadDir },
            sendProgress
          );

          if (!scrapeResult.success) {
            sendProgress({
              phase: "error",
              message: `Scraping failed: ${scrapeResult.errors.join(", ")}`,
              timestamp: new Date().toISOString(),
            });
            controller.close();
            return;
          }

          // Phase 2: Ingest downloaded files
          sendProgress({
            phase: "ingesting",
            message: "Processing downloaded materials...",
            timestamp: new Date().toISOString(),
          });

          const ingestResult = await ingestScrapedFiles(downloadDir, sendProgress);

          // Phase 3: Complete
          sendProgress({
            phase: "complete",
            message: `Import complete! Created ${ingestResult.coursesCreated.length} courses from ${ingestResult.filesProcessed} files.`,
            filesDownloaded: scrapeResult.filesDownloaded,
            coursesScraped: ingestResult.coursesCreated.length,
            timestamp: new Date().toISOString(),
          });

          controller.close();
        } catch (error) {
          sendProgress({
            phase: "error",
            message: `Error: ${(error as Error).message}`,
            timestamp: new Date().toISOString(),
          });
          controller.close();
        } finally {
          // Cleanup temp directory
          try {
            fs.rmSync(downloadDir, { recursive: true, force: true });
          } catch {
            // ignore cleanup errors
          }
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
    console.error("Scrape route error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start scraping" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
