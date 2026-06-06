// Embedding Generation & Vector Search Service
// Generates embeddings via OpenRouter and stores/queries them in PostgreSQL with pgvector

import prisma from "./prisma";
import { generateEmbedding } from "./openrouter";

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

  // Create the embedding record (without vector) to get the ID
  const record = await prisma.embedding.create({
    data: {
      paperId,
      sectionId: sectionId || null,
      label,
    },
  });

  // Store the vector using raw SQL (Prisma doesn't support pgvector natively)
  const vectorStr = `[${embedding.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE embeddings SET embedding = $1::vector WHERE id = $2`,
    vectorStr,
    record.id
  );

  return record.id;
}

/**
 * Search for similar embeddings using cosine distance
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
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // Build the query with optional workspace and label filters
  let query = `
    SELECT e.id, e.paper_id as "paperId", e.section_id as "sectionId", e.label,
           e.embedding <=> $1::vector as distance
    FROM embeddings e
    JOIN papers p ON e.paper_id = p.id
    WHERE e.embedding IS NOT NULL
  `;

  const params_arr: unknown[] = [vectorStr];
  let paramIdx = 2;

  if (workspaceId) {
    query += ` AND p.workspace_id = $${paramIdx}`;
    params_arr.push(workspaceId);
    paramIdx++;
  }

  if (label) {
    query += ` AND e.label = $${paramIdx}`;
    params_arr.push(label);
    paramIdx++;
  }

  query += ` ORDER BY distance ASC LIMIT $${paramIdx}`;
  params_arr.push(limit);

  const results = await prisma.$queryRawUnsafe<
    {
      id: string;
      paperId: string;
      sectionId: string | null;
      label: string | null;
      distance: number;
    }[]
  >(query, ...params_arr);

  return results;
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
  let query = `
    SELECT e.id, e.paper_id as "paperId",
           e.embedding::text as "embeddingText"
    FROM embeddings e
    JOIN papers p ON e.paper_id = p.id
    WHERE e.embedding IS NOT NULL
    AND p.workspace_id = $1
  `;

  const params_arr: unknown[] = [workspaceId];

  if (label) {
    query += ` AND e.label = $2`;
    params_arr.push(label);
  }

  const results = await prisma.$queryRawUnsafe<
    {
      id: string;
      paperId: string;
      embeddingText: string;
    }[]
  >(query, ...params_arr);

  // Parse embedding text back to number arrays
  return results.map((r) => ({
    id: r.id,
    paperId: r.paperId,
    embedding: JSON.parse(r.embeddingText),
  }));
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
