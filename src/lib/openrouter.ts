// OpenRouter API Client
// Provides LLM chat completion and embedding generation via OpenRouter

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "google/gemini-2.5-flash";
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface EmbeddingResponse {
  data: {
    embedding: number[];
    index: number;
  }[];
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a chat completion request to OpenRouter
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
  }
): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ResearchGap AI",
    },
    body: JSON.stringify({
      model: options?.model || LLM_MODEL,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      response_format: options?.responseFormat,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenRouter API error (${response.status}): ${errorBody}`
    );
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  return content;
}

/**
 * Generate embeddings for text using OpenRouter
 */
export async function generateEmbedding(
  text: string,
  model?: string
): Promise<number[]> {
  // Clean and truncate text (embedding models have token limits)
  const cleanText = text.replace(/\s+/g, " ").trim().slice(0, 8000);

  const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ResearchGap AI",
    },
    body: JSON.stringify({
      model: model || EMBEDDING_MODEL,
      input: cleanText,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenRouter Embedding API error (${response.status}): ${errorBody}`
    );
  }

  const data: EmbeddingResponse = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!embedding || embedding.length === 0) {
    throw new Error("No embedding returned from OpenRouter");
  }

  return embedding;
}

/**
 * Extract structured sections from a research paper using LLM
 */
export async function extractPaperSections(
  paperText: string
): Promise<{
  title: string;
  authors: string;
  abstract: string;
  year: number | null;
  journal: string;
  sections: {
    research_question: string;
    methodology: string;
    dataset: string;
    key_findings: string;
    limitation: string;
    future_work: string;
  };
}> {
  const prompt = `You are an expert research paper analyzer. Extract the following structured information from the given research paper text. Be thorough and precise.

Return a JSON object with exactly this structure:
{
  "title": "Full paper title",
  "authors": "Comma-separated author names",
  "abstract": "The paper's abstract (or a concise summary if no explicit abstract)",
  "year": 2024,
  "journal": "Journal or conference name if identifiable",
  "sections": {
    "research_question": "The main research question(s) or objectives addressed",
    "methodology": "Detailed methodology description including algorithms, frameworks, techniques used",
    "dataset": "Datasets used, their characteristics, sizes, and sources",
    "key_findings": "Main results, contributions, and findings",
    "limitation": "Explicitly stated limitations and constraints of the research",
    "future_work": "Suggested future research directions mentioned by the authors"
  }
}

If a field cannot be determined from the text, provide your best inference or "Not explicitly stated" for text fields, and null for year.

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no explanations.`;

  const response = await chatCompletion([
    { role: "system", content: prompt },
    {
      role: "user",
      content: `Analyze this research paper:\n\n${paperText.slice(0, 15000)}`,
    },
  ]);

  try {
    // Try to parse the response as JSON, handling potential markdown code blocks
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse LLM response as JSON:", response);
    throw new Error("LLM did not return valid JSON for paper extraction");
  }
}

/**
 * Detect research gaps based on cluster analysis
 */
export async function detectGaps(
  clusterContext: {
    clusterName: string;
    papers: {
      title: string;
      methodology: string;
      dataset: string;
      limitation: string;
      futureWork: string;
      year: number | null;
    }[];
  }[]
): Promise<
  {
    gapTitle: string;
    gapDescription: string;
    suggestedMethodology: string;
    potentialImpact: string;
    confidenceScore: number;
    relatedCluster: string;
  }[]
> {
  const prompt = `You are a senior research advisor specializing in identifying research gaps and novel opportunities. Analyze the following research clusters and their papers to identify unexplored research opportunities.

For each cluster, you have papers with their:
- Methodology used
- Datasets used
- Limitations stated
- Future work suggested

Your task:
1. Identify methodological gaps (techniques not yet applied to this domain)
2. Identify dataset gaps (missing combinations or underrepresented data)
3. Identify cross-domain opportunities (insights from one cluster applicable to another)
4. Identify emerging trends (based on publication years and evolving methods)

Return a JSON array of gap objects with this structure:
[
  {
    "gapTitle": "Concise title of the research gap",
    "gapDescription": "Detailed description of the gap and why it matters",
    "suggestedMethodology": "Proposed approach to address this gap",
    "potentialImpact": "Expected impact if this gap is addressed",
    "confidenceScore": 0.85,
    "relatedCluster": "Name of the most related cluster"
  }
]

Generate between 3-8 gaps. Confidence scores should range from 0.5 to 0.95.
IMPORTANT: Return ONLY the JSON array, no markdown, no code blocks.`;

  const clusterSummary = clusterContext
    .map((cluster) => {
      const paperSummaries = cluster.papers
        .map(
          (p) =>
            `  - "${p.title}" (${p.year || "N/A"})
    Methodology: ${p.methodology}
    Dataset: ${p.dataset}
    Limitations: ${p.limitation}
    Future Work: ${p.futureWork}`
        )
        .join("\n");
      return `Cluster: ${cluster.clusterName}\nPapers:\n${paperSummaries}`;
    })
    .join("\n\n---\n\n");

  const response = await chatCompletion([
    { role: "system", content: prompt },
    { role: "user", content: clusterSummary.slice(0, 15000) },
  ]);

  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse gap detection response:", response);
    throw new Error("LLM did not return valid JSON for gap detection");
  }
}
