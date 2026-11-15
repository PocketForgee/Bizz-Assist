import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, rateLimit, readJson, str } from "@/lib/http";
import { DOC_MAX_BYTES, DOC_MAX_CHARS, fileText } from "@/lib/ingest/doc";
import { clean } from "@/lib/ingest/web";

/** multipart/form-data with `file` (PDF, TXT, MD), or JSON { title, text } for pasted text. Only the text is stored. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  rateLimit(req, "kb-doc", 20, 60_000);

  let title: string;
  let text: string;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose a file to upload.", "file");
    if (file.size > DOC_MAX_BYTES) throw new HttpError(400, "Files can be up to 10 MB.", "file");
    try {
      text = await fileText(file.name, file.type, new Uint8Array(await file.arrayBuffer()));
    } catch (err) {
      throw new HttpError(400, err instanceof Error && err.message.startsWith("Upload") ? err.message : "Couldn't read that file. Is it a text-based PDF?", "file");
    }
    title = file.name.slice(0, 200);
  } else {
    const body = await readJson(req);
    title = str(body, "title", { max: 200, label: "a title" });
    text = clean(str(body, "text", { max: DOC_MAX_CHARS, label: "some text" }));
  }
  if (text.length < 20) throw new HttpError(400, "We found no text in that document. Scanned PDFs are not supported.", "file");

  const [item] = await sql`
    insert into knowledge_items (business_id, source, title, content, status)
    values (${user.business_id}, 'doc', ${title}, ${text}, 'ready')
    returning id, source, title, url, status, error, length(content)::int as chars, updated_at
  `;
  return json({ item }, 201);
});
