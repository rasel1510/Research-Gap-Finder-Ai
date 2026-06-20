// Papers API - List and Upload
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parsePDF } from "@/lib/pdf-parser";
import { extractPaperSections } from "@/lib/openrouter";
import { generatePaperEmbeddings } from "@/lib/embeddings";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * Strip characters that PostgreSQL's UTF-8 encoding rejects.
 * Null bytes (0x00) are the most common culprit from PDF extraction.
 */
function sanitizeForDb(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value
    .replace(/\0/g, "")                         // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // other control chars
    .trim() || null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const papers = await prisma.paper.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            sections: true,
            embeddings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(papers);
  } catch (error) {
    console.error("Papers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch papers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId = formData.get("workspaceId") as string;

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: "File and workspaceId are required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // Save the PDF file
    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create paper record with PENDING status
    const paper = await prisma.paper.create({
      data: {
        workspaceId,
        title: file.name.replace(".pdf", ""),
        pdfUrl: `/uploads/${fileName}`,
        status: "PENDING",
      },
    });

    // Start async processing (don't await - respond immediately)
    processPaperAsync(paper.id, buffer).catch((err) => {
      console.error(`Async paper processing failed for ${paper.id}:`, err);
    });

    return NextResponse.json(paper, { status: 201 });
  } catch (error) {
    console.error("Paper upload error:", error);
    return NextResponse.json({ error: "Failed to upload paper" }, { status: 500 });
  }
}

/**
 * Async paper processing pipeline
 * 1. Parse PDF text
 * 2. Extract sections via LLM
 * 3. Generate embeddings
 */
async function processPaperAsync(paperId: string, buffer: Buffer) {
  try {
    // Update status to PROCESSING
    await prisma.paper.update({
      where: { id: paperId },
      data: { status: "PROCESSING" },
    });

    // Step 1: Parse PDF
    const parsed = await parsePDF(buffer);

    // Step 2: Extract structured sections via LLM
    const extracted = await extractPaperSections(parsed.text);

    // Step 3: Update paper with extracted metadata
    // sanitizeForDb guards against null bytes (Postgres error 22021)
    await prisma.paper.update({
      where: { id: paperId },
      data: {
        title: sanitizeForDb(extracted.title) || "Untitled Paper",
        authors: sanitizeForDb(extracted.authors),
        abstract: sanitizeForDb(extracted.abstract),
        year: extracted.year || null,
        journal: sanitizeForDb(extracted.journal),
        rawText: sanitizeForDb(parsed.text.slice(0, 50000)), // Limit stored text
      },
    });

    // Step 4: Store extracted sections
    const sectionTypes = [
      { type: "RESEARCH_QUESTION" as const, content: extracted.sections.research_question },
      { type: "METHODOLOGY" as const, content: extracted.sections.methodology },
      { type: "DATASET" as const, content: extracted.sections.dataset },
      { type: "KEY_FINDINGS" as const, content: extracted.sections.key_findings },
      { type: "LIMITATION" as const, content: extracted.sections.limitation },
      { type: "FUTURE_WORK" as const, content: extracted.sections.future_work },
    ];

    for (const section of sectionTypes) {
      const safeContent = sanitizeForDb(section.content);
      if (safeContent && safeContent !== "Not explicitly stated") {
        await prisma.paperSection.create({
          data: {
            paperId,
            sectionType: section.type,
            content: safeContent,
          },
        });
      }
    }

    // Step 5: Generate embeddings
    await generatePaperEmbeddings(paperId);

    // Step 6: Mark as completed
    await prisma.paper.update({
      where: { id: paperId },
      data: { status: "COMPLETED" },
    });
  } catch (error) {
    console.error(`Paper processing error for ${paperId}:`, error);
    await prisma.paper.update({
      where: { id: paperId },
      data: { status: "FAILED" },
    });
  }
}


