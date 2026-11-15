// Document training: only the extracted text is stored, never the file.
import { extractText, getDocumentProxy } from "unpdf";
import { clean } from "./web";

export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const DOC_MAX_CHARS = 100_000;

export async function pdfText(data: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  return clean(text).slice(0, DOC_MAX_CHARS);
}

/** Text of an uploaded file by extension / MIME type. Throws a user-facing Error for unsupported files. */
export async function fileText(name: string, type: string, data: Uint8Array): Promise<string> {
  const lower = name.toLowerCase();
  if (type === "application/pdf" || lower.endsWith(".pdf")) return pdfText(data);
  if (type.startsWith("text/") || /\.(txt|md|csv)$/.test(lower)) {
    return clean(new TextDecoder("utf-8", { fatal: false }).decode(data)).slice(0, DOC_MAX_CHARS);
  }
  throw new Error("Upload a PDF or a text file (.txt, .md).");
}
