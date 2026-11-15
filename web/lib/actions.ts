// API Actions: business-defined lookups the bot can call as model tools.
//   rest  -> HTTPS request built from a URL template, optional encrypted headers
//   sheet -> published Google Sheet CSV; a row is returned only when BOTH order ID and email/phone match
import type { FunctionDeclaration } from "@google/genai";
import { decrypt } from "./crypto";
import { fetchErrorMessage, safeFetch } from "./net";

export type ActionParam = { name: string; description: string; required: boolean };
export type SheetMatch = { order_column: string; contact_column: string };

export type ApiAction = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  kind: "rest" | "sheet";
  method: "GET" | "POST";
  url_template: string;
  params: ActionParam[];
  headers_enc: string | null;
  sheet_match: SheetMatch | null;
};

export type ActionResult = { ok: boolean; status?: number; body: string };

export const RESPONSE_CAP = 4096; // bytes handed to the model
const SHEET_CAP = 2 * 1024 * 1024;

export const PARAM_NAME = /^[a-z][a-z0-9_]{0,39}$/;

/** Tool function names: letters, digits, underscore. */
export const toolName = (a: Pick<ApiAction, "id">) => `action_${a.id.replace(/-/g, "")}`;

export function toolDeclaration(a: ApiAction): FunctionDeclaration {
  if (a.kind === "sheet") {
    return {
      name: toolName(a),
      description: `${a.name}: ${a.description}`.slice(0, 1000) + " Needs BOTH the order ID and the customer's email or phone number; ask the customer for any you don't have.",
      parametersJsonSchema: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Order ID exactly as the customer gave it." },
          contact: { type: "string", description: "The email address or phone number on the order." },
        },
        required: ["order_id", "contact"],
      },
    };
  }
  return {
    name: toolName(a),
    description: `${a.name}: ${a.description}`.slice(0, 1000),
    parametersJsonSchema: {
      type: "object",
      properties: Object.fromEntries(a.params.map((p) => [p.name, { type: "string", description: p.description || p.name }])),
      required: a.params.filter((p) => p.required).map((p) => p.name),
    },
  };
}

/** Fills {param} placeholders with URL-encoded values. Throws on a missing required value. */
export function fillTemplate(template: string, args: Record<string, unknown>, params: ActionParam[] = []): string {
  for (const p of params) {
    if (p.required && (args[p.name] === undefined || args[p.name] === null || String(args[p.name]).trim() === "")) {
      throw new Error(`Missing ${p.name}.`);
    }
  }
  return template.replace(/\{([a-z][a-z0-9_]*)\}/g, (_, name: string) => encodeURIComponent(String(args[name] ?? "").trim()));
}

// ---- CSV + sheet matching ----

/** RFC 4180-ish CSV parser: quotes, escaped quotes, CRLF, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const digits = (v: string) => v.replace(/\D/g, "");

/** Email: case-insensitive equal. Phone: last 10 digits equal (at least 6 digits given). */
export function contactMatches(given: string, stored: string): boolean {
  const g = given.trim().toLowerCase();
  const s = stored.trim().toLowerCase();
  if (!g || !s) return false;
  if (g.includes("@") || s.includes("@")) return g === s;
  const gd = digits(g);
  const sd = digits(s);
  if (gd.length < 6 || sd.length < 6) return false;
  return gd.slice(-10) === sd.slice(-10);
}

/** Returns the row (header -> value) where BOTH the order ID and the contact match, else null. */
export function matchSheetRow(rows: string[][], match: SheetMatch, orderId: string, contact: string): Record<string, string> | null {
  if (rows.length < 2 || !orderId.trim() || !contact.trim()) return null;
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const oi = header.indexOf(match.order_column.trim().toLowerCase());
  const ci = header.indexOf(match.contact_column.trim().toLowerCase());
  if (oi < 0 || ci < 0) return null;
  const wantOrder = orderId.trim().replace(/^#/, "").toLowerCase();
  for (const r of rows.slice(1)) {
    const order = (r[oi] ?? "").trim().replace(/^#/, "").toLowerCase();
    if (order && order === wantOrder && contactMatches(contact, r[ci] ?? "")) {
      return Object.fromEntries(rows[0].map((h, i) => [h.trim(), (r[i] ?? "").trim()]));
    }
  }
  return null;
}

function cap(s: string): string {
  const b = Buffer.from(s, "utf8");
  return b.length <= RESPONSE_CAP ? s : b.subarray(0, RESPONSE_CAP).toString("utf8") + " …(truncated)";
}

/** Runs an action. Never throws: failures come back as { ok: false, body: reason } for the model / Test button. */
export async function runAction(a: ApiAction, args: Record<string, unknown>): Promise<ActionResult> {
  try {
    if (a.kind === "sheet") {
      if (!a.sheet_match) return { ok: false, body: "This sheet action has no matching columns set." };
      const orderId = String(args.order_id ?? "");
      const contact = String(args.contact ?? "");
      if (!orderId.trim() || !contact.trim()) return { ok: false, body: "Ask the customer for both the order ID and the email or phone on the order." };
      const res = await safeFetch(a.url_template, { maxBytes: SHEET_CAP, timeoutMs: 5000 });
      if (!res.ok) return { ok: false, status: res.status, body: `The sheet returned HTTP ${res.status}.` };
      const row = matchSheetRow(parseCsv(res.body.toString("utf8")), a.sheet_match, orderId, contact);
      return row
        ? { ok: true, status: 200, body: cap(JSON.stringify(row)) }
        : { ok: true, status: 200, body: "No order matches that order ID together with that email or phone number." };
    }

    const url = fillTemplate(a.url_template, args, a.params);
    const headers: Record<string, string> = a.headers_enc ? (JSON.parse(decrypt(a.headers_enc)) as Record<string, string>) : {};
    let body: string | undefined;
    if (a.method === "POST") {
      const used = new Set([...a.url_template.matchAll(/\{([a-z][a-z0-9_]*)\}/g)].map((m) => m[1]));
      body = JSON.stringify(Object.fromEntries(a.params.filter((p) => !used.has(p.name) && args[p.name] !== undefined).map((p) => [p.name, String(args[p.name])])));
      headers["Content-Type"] ??= "application/json";
    }
    const res = await safeFetch(url, { method: a.method, headers, body, maxBytes: RESPONSE_CAP, timeoutMs: 5000 });
    const text = res.body.toString("utf8") + (res.truncated ? " …(truncated)" : "");
    return { ok: res.ok, status: res.status, body: text || `HTTP ${res.status}` };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Missing ")) return { ok: false, body: `${err.message} Ask the customer for it.` };
    return { ok: false, body: fetchErrorMessage(err) };
  }
}
