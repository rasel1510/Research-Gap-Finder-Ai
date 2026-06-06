// Paper Detail API
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paper = await prisma.paper.findUnique({
      where: { id: params.id },
      include: {
        sections: true,
        clusters: true,
        workspace: {
          select: { id: true, name: true, userId: true },
        },
        _count: {
          select: { embeddings: true },
        },
      },
    });

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    return NextResponse.json(paper);
  } catch (error) {
    console.error("Paper detail error:", error);
    return NextResponse.json({ error: "Failed to fetch paper" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.paper.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Paper deleted" });
  } catch (error) {
    console.error("Paper delete error:", error);
    return NextResponse.json({ error: "Failed to delete paper" }, { status: 500 });
  }
}
