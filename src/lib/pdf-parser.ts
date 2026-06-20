import { PDFParse } from "pdf-parse";

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
 * Sanitize a string so it is safe to store in PostgreSQL UTF-8 columns.
 * - Removes null bytes (0x00) which Postgres rejects entirely.
 * - Removes other non-printable C0/C1 control characters (except common
 *   whitespace: tab \t, newline \n, carriage return \r).
 */
function sanitizeText(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  return (
    input
      // Strip null bytes – the primary cause of the Postgres 22021 error
      .replace(/\0/g, "")
      // Strip non-printable control chars except \t \n \r
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim() || undefined
  );
}

/**
 * Parse a PDF buffer and extract text content
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    return {
      text: sanitizeText(textResult.text) ?? "",
      numPages: textResult.total,
      info: {
        title: sanitizeText(infoResult.info?.Title),
        author: sanitizeText(infoResult.info?.Author),
        subject: sanitizeText(infoResult.info?.Subject),
        creator: sanitizeText(infoResult.info?.Creator),
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
