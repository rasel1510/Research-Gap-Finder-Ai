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
 * Parse a PDF buffer and extract text content
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    return {
      text: textResult.text,
      numPages: textResult.total,
      info: {
        title: infoResult.info?.Title || undefined,
        author: infoResult.info?.Author || undefined,
        subject: infoResult.info?.Subject || undefined,
        creator: infoResult.info?.Creator || undefined,
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
