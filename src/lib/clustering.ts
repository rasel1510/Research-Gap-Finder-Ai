// Clustering Engine
// Groups papers into thematic clusters using K-means on their embeddings

import { kmeans } from "ml-kmeans";
import prisma from "./prisma";
import { getWorkspaceEmbeddings } from "./embeddings";
import { chatCompletion } from "./openrouter";
import { generateClusterColor } from "./utils";

interface ClusterResult {
  clusterIndex: number;
  centroid: number[];
  paperIds: string[];
}

/**
 * Run K-means clustering on workspace embeddings
 */
export async function clusterWorkspacePapers(
  workspaceId: string,
  options?: { k?: number }
): Promise<{ clusters: ClusterResult[]; k: number }> {
  // Get all abstract embeddings for the workspace
  const embeddings = await getWorkspaceEmbeddings(workspaceId, "abstract");

  if (embeddings.length < 2) {
    throw new Error("Need at least 2 papers with embeddings to cluster");
  }

  // Determine optimal K (auto or specified)
  const k = options?.k || Math.min(Math.max(2, Math.ceil(Math.sqrt(embeddings.length / 2))), 10);

  // Prepare data matrix
  const dataMatrix = embeddings.map((e) => e.embedding);

  // Run K-means
  const result = kmeans(dataMatrix, k, {
    initialization: "kmeans++",
    maxIterations: 100,
  });

  // Group papers by cluster assignment
  const clusters: ClusterResult[] = [];
  for (let i = 0; i < k; i++) {
    const paperIds = embeddings
      .filter((_, idx) => result.clusters[idx] === i)
      .map((e) => e.paperId);

    // Remove duplicate paper IDs (a paper may have multiple embeddings)
    const uniquePaperIds = [...new Set(paperIds)];

    if (uniquePaperIds.length > 0) {
      clusters.push({
        clusterIndex: i,
        centroid: result.centroids[i],
        paperIds: uniquePaperIds,
      });
    }
  }

  return { clusters, k };
}

/**
 * Generate descriptive names for clusters using LLM
 */
async function generateClusterName(
  paperTitles: string[]
): Promise<{ name: string; description: string }> {
  const prompt = `Given these research paper titles that belong to the same thematic cluster, generate:
1. A concise cluster name (2-4 words) that captures the common theme
2. A brief description (1-2 sentences) of what this research cluster covers

Paper titles:
${paperTitles.map((t) => `- ${t}`).join("\n")}

Return ONLY a JSON object: {"name": "Cluster Name", "description": "Brief description"}`;

  const response = await chatCompletion([
    { role: "user", content: prompt },
  ]);

  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    return JSON.parse(jsonStr.trim());
  } catch {
    return {
      name: `Research Cluster`,
      description: "A thematic cluster of related research papers",
    };
  }
}

/**
 * Full clustering pipeline: cluster, name, and store
 */
export async function runClusteringPipeline(
  workspaceId: string,
  options?: { k?: number }
): Promise<void> {
  // Delete existing clusters for this workspace
  await prisma.cluster.deleteMany({ where: { workspaceId } });

  // Run clustering
  const { clusters } = await clusterWorkspacePapers(workspaceId, options);

  // For each cluster, generate name and store
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    // Get paper titles for naming
    const papers = await prisma.paper.findMany({
      where: { id: { in: cluster.paperIds } },
      select: { id: true, title: true },
    });

    const { name, description } = await generateClusterName(
      papers.map((p) => p.title)
    );

    // Create cluster with paper connections
    await prisma.cluster.create({
      data: {
        workspaceId,
        clusterName: name,
        description,
        color: generateClusterColor(i),
        papers: {
          connect: papers.map((p) => ({ id: p.id })),
        },
      },
    });
  }
}
