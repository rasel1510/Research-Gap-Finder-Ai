// PDF Parser Service
// Extracts text content from uploaded PDF files

import pdf from "pdf-parse";

export interface ParsedPDF {
  text: string;
  numPages: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

/**
 * Parse a PDF buffer and extract text content
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const data = await pdf(buffer);

    return {
      text: data.text,
      numPages: data.numpages,
      info: {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        subject: data.info?.Subject || undefined,
        creator: data.info?.Creator || undefined,
      },
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Parse a PDF from a File (form upload)
 */
export async function parsePDFFromFile(file: File): Promise<ParsedPDF> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return parsePDF(buffer);
}
