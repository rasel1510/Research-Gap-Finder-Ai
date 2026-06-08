// Embedding Generation & Vector Search Service
// Generates embeddings via OpenRouter and stores/queries them in PostgreSQL with in-memory fallback

import prisma from "./prisma";
import { generateEmbedding } from "./openrouter";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate and store an embedding for a text chunk
 */
export async function createAndStoreEmbedding(params: {
  paperId: string;
  sectionId?: string;
  label: string;
  text: string;
}): Promise<string> {
  const { paperId, sectionId, label, text } = params;

  if (!text || text.trim().length < 10) {
    throw new Error("Text too short to generate meaningful embedding");
  }

  // Generate embedding vector via OpenRouter
  const embedding = await generateEmbedding(text);

  // Create the embedding record with the vector stringified as JSON text
  const record = await prisma.embedding.create({
    data: {
      paperId,
      sectionId: sectionId || null,
      label,
      embedding: JSON.stringify(embedding),
    },
  });

  return record.id;
}

/**
 * Search for similar embeddings using cosine distance (computed in-memory)
 */
export async function searchSimilarEmbeddings(params: {
  queryText: string;
  workspaceId?: string;
  limit?: number;
  label?: string;
}): Promise<
  {
    id: string;
    paperId: string;
    sectionId: string | null;
    label: string | null;
    distance: number;
  }[]
> {
  const { queryText, workspaceId, limit = 10, label } = params;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText);

  // Fetch candidate embeddings from DB
  const candidates = await prisma.embedding.findMany({
    where: {
      embedding: { not: null },
      paper: workspaceId ? { workspaceId } : undefined,
      label: label || undefined,
    },
    select: {
      id: true,
      paperId: true,
      sectionId: true,
      label: true,
      embedding: true,
    },
  });

  // Calculate distances in-memory
  const scored = candidates
    .map((c) => {
      try {
        const vector = JSON.parse(c.embedding!);
        const similarity = cosineSimilarity(queryEmbedding, vector);
        return {
          id: c.id,
          paperId: c.paperId,
          sectionId: c.sectionId,
          label: c.label,
          distance: 1 - similarity, // Cosine distance
        };
      } catch (err) {
        return null;
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // Sort and limit
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, limit);
}

/**
 * Get all embeddings for a workspace (for clustering)
 * Returns embedding vectors as number arrays
 */
export async function getWorkspaceEmbeddings(
  workspaceId: string,
  label?: string
): Promise<
  {
    id: string;
    paperId: string;
    embedding: number[];
  }[]
> {
  const results = await prisma.embedding.findMany({
    where: {
      embedding: { not: null },
      paper: { workspaceId },
      label: label || undefined,
    },
    select: {
      id: true,
      paperId: true,
      embedding: true,
    },
  });

  // Parse embedding text back to number arrays
  return results
    .map((r) => {
      try {
        return {
          id: r.id,
          paperId: r.paperId,
          embedding: JSON.parse(r.embedding!),
        };
      } catch (e) {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * Generate embeddings for all sections of a paper
 */
export async function generatePaperEmbeddings(paperId: string): Promise<void> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: { sections: true },
  });

  if (!paper) throw new Error(`Paper not found: ${paperId}`);

  const embeddingTasks: Promise<string>[] = [];

  // Embed abstract
  if (paper.abstract) {
    embeddingTasks.push(
      createAndStoreEmbedding({
        paperId: paper.id,
        label: "abstract",
        text: paper.abstract,
      })
    );
  }

  // Embed each section
  for (const section of paper.sections) {
    if (section.content && section.content.length > 20) {
      embeddingTasks.push(
        createAndStoreEmbedding({
          paperId: paper.id,
          sectionId: section.id,
          label: section.sectionType.toLowerCase(),
          text: section.content,
        })
      );
    }
  }

  await Promise.all(embeddingTasks);
}
