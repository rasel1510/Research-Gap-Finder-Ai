// Semantic Search API (RAG)
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { searchSimilarEmbeddings } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, workspaceId, limit = 10 } = await req.json();

    if (!query || !workspaceId) {
      return NextResponse.json(
        { error: "query and workspaceId are required" },
        { status: 400 }
      );
    }

    // Search for similar embeddings
    const results = await searchSimilarEmbeddings({
      queryText: query,
      workspaceId,
      limit,
    });

    // Fetch paper details for results
    const paperIds = [...new Set(results.map((r) => r.paperId))];
    const papers = await prisma.paper.findMany({
      where: { id: { in: paperIds } },
      select: {
        id: true,
        title: true,
        authors: true,
        abstract: true,
        year: true,
      },
    });

    // Combine results with paper details
    const enrichedResults = results.map((r) => ({
      ...r,
      paper: papers.find((p) => p.id === r.paperId),
      similarity: 1 - r.distance, // Convert distance to similarity
    }));

    return NextResponse.json(enrichedResults);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
