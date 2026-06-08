const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Setting up pgvector extension and column...");
  try {
    // 1. Enable extension
    console.log("Enabling vector extension...");
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("✓ Vector extension enabled.");

    // 2. Add embedding column to embeddings table
    console.log("Adding embedding vector column (1536 dimensions)...");
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE embeddings ADD COLUMN embedding vector(1536);`
      );
      console.log("✓ Column added successfully.");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("✓ Column already exists.");
      } else {
        throw err;
      }
    }

    // 3. Add HNSW index
    console.log("Creating HNSW index on embedding column...");
    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS embeddings_embedding_idx ON embeddings USING hnsw (embedding vector_cosine_ops);`
      );
      console.log("✓ HNSW index created.");
    } catch (err) {
      console.log("⚠️ Could not create index. Ensure you have pgvector 0.5+ installed.");
      console.log("Error details:", err.message);
    }

    console.log("🎉 Database vector schema setup complete!");
  } catch (error) {
    console.error("❌ Vector setup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
