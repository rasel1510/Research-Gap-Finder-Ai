// Research Gap Detection Engine
// The innovation core — identifies unexplored research opportunities

import prisma from "./prisma";
import { detectGaps } from "./openrouter";

/**
 * Full gap detection pipeline for a workspace
 * 1. Gathers cluster and paper data
 * 2. Sends to LLM for gap analysis
 * 3. Stores results
 */
export async function runGapDetectionPipeline(
  workspaceId: string
): Promise<void> {
  // Delete existing gaps for this workspace
  await prisma.gapSuggestion.deleteMany({ where: { workspaceId } });

  // Get all clusters with their papers and sections
  const clusters = await prisma.cluster.findMany({
    where: { workspaceId },
    include: {
      papers: {
        include: {
          sections: true,
        },
      },
    },
  });

  if (clusters.length === 0) {
    throw new Error(
      "No clusters found. Please run clustering before gap detection."
    );
  }

  // Build context for the LLM
  const clusterContext = clusters.map((cluster) => ({
    clusterName: cluster.clusterName,
    papers: cluster.papers.map((paper) => {
      const getSection = (type: string) =>
        paper.sections.find((s) => s.sectionType === type)?.content ||
        "Not available";

      return {
        title: paper.title,
        methodology: getSection("METHODOLOGY"),
        dataset: getSection("DATASET"),
        limitation: getSection("LIMITATION"),
        futureWork: getSection("FUTURE_WORK"),
        year: paper.year,
      };
    }),
  }));

  // Run LLM gap detection
  const gaps = await detectGaps(clusterContext);

  // Store results
  for (const gap of gaps) {
    // Find the matching cluster
    const matchingCluster = clusters.find(
      (c) =>
        c.clusterName.toLowerCase() === gap.relatedCluster?.toLowerCase()
    );

    // Find related paper IDs from the cluster
    const relatedPaperIds = matchingCluster
      ? matchingCluster.papers.map((p) => p.id)
      : [];

    await prisma.gapSuggestion.create({
      data: {
        workspaceId,
        clusterId: matchingCluster?.id || null,
        gapTitle: gap.gapTitle,
        gapDescription: gap.gapDescription,
        suggestedMethodology: gap.suggestedMethodology || null,
        potentialImpact: gap.potentialImpact || null,
        confidenceScore: Math.min(Math.max(gap.confidenceScore, 0), 1),
        relatedPaperIds,
      },
    });
  }
}

/**
 * Get gap statistics for a workspace
 */
export async function getGapStats(workspaceId: string) {
  const gaps = await prisma.gapSuggestion.findMany({
    where: { workspaceId },
    include: { cluster: true },
  });

  const highConfidence = gaps.filter((g) => g.confidenceScore >= 0.8).length;
  const mediumConfidence = gaps.filter(
    (g) => g.confidenceScore >= 0.6 && g.confidenceScore < 0.8
  ).length;
  const lowConfidence = gaps.filter((g) => g.confidenceScore < 0.6).length;

  return {
    total: gaps.length,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    gaps,
  };
}
