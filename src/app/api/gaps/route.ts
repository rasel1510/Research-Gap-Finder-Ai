// Gap Detection API
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { runGapDetectionPipeline } from "@/lib/gap-detection";

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

    const gaps = await prisma.gapSuggestion.findMany({
      where: { workspaceId },
      include: {
        cluster: {
          select: { id: true, clusterName: true, color: true },
        },
      },
      orderBy: { confidenceScore: "desc" },
    });

    return NextResponse.json(gaps);
  } catch (error) {
    console.error("Gaps GET error:", error);
    return NextResponse.json({ error: "Failed to fetch gaps" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    await runGapDetectionPipeline(workspaceId);

    const gaps = await prisma.gapSuggestion.findMany({
      where: { workspaceId },
      include: {
        cluster: {
          select: { id: true, clusterName: true, color: true },
        },
      },
      orderBy: { confidenceScore: "desc" },
    });

    return NextResponse.json(gaps, { status: 201 });
  } catch (error) {
    console.error("Gap detection error:", error);
    const message = error instanceof Error ? error.message : "Gap detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
