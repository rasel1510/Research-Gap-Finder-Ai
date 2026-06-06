// Clusters API
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { runClusteringPipeline } from "@/lib/clustering";

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

    const clusters = await prisma.cluster.findMany({
      where: { workspaceId },
      include: {
        papers: {
          select: {
            id: true,
            title: true,
            authors: true,
            year: true,
            abstract: true,
          },
        },
        _count: {
          select: { gaps: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clusters);
  } catch (error) {
    console.error("Clusters GET error:", error);
    return NextResponse.json({ error: "Failed to fetch clusters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, k } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    await runClusteringPipeline(workspaceId, { k });

    const clusters = await prisma.cluster.findMany({
      where: { workspaceId },
      include: {
        papers: {
          select: { id: true, title: true, authors: true, year: true },
        },
      },
    });

    return NextResponse.json(clusters, { status: 201 });
  } catch (error) {
    console.error("Clustering error:", error);
    const message = error instanceof Error ? error.message : "Clustering failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
