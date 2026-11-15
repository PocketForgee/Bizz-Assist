// Validation for API Action create/update bodies (trust boundary).
import { HttpError, str } from "./http";
import { PARAM_NAME, type ActionParam, type SheetMatch } from "./actions";
import { encrypt } from "./crypto";

export type ActionInput = {
  name: string;
  description: string;
  kind: "rest" | "sheet";
  method: "GET" | "POST";
  url_template: string;
  params: ActionParam[];
  sheet_match: SheetMatch | null;
  /** undefined = keep stored headers; null = clear them */
  headers_enc?: string | null;
};

const HEADER_NAME = /^[A-Za-z0-9-]{1,64}$/;

export function parseActionInput(body: Record<string, unknown>): ActionInput {
  const name = str(body, "name", { max: 60, label: "a name" });
  const description = str(body, "description", { max: 500, label: "a description of when to use it" });
  const kind = body.kind === "sheet" ? "sheet" : body.kind === "rest" ? "rest" : null;
  if (!kind) throw new HttpError(400, "Choose REST API or Google Sheet.", "kind");
  const url_template = str(body, "url_template", { max: 1000, label: "a URL" });
  if (!/^https:\/\//i.test(url_template)) throw new HttpError(400, "The URL must start with https://", "url_template");

  if (kind === "sheet") {
    const sm = (body.sheet_match ?? {}) as Record<string, unknown>;
    const order_column = str(sm, "order_column", { max: 80, label: "the order ID column name" });
    const contact_column = str(sm, "contact_column", { max: 80, label: "the email or phone column name" });
    return { name, description, kind, method: "GET", url_template, params: [], sheet_match: { order_column, contact_column }, headers_enc: null };
  }

  const method = body.method === "POST" ? "POST" : "GET";
  const rawParams = Array.isArray(body.params) ? body.params : [];
  if (rawParams.length > 10) throw new HttpError(400, "Up to 10 parameters.", "params");
  const params: ActionParam[] = rawParams.map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const pname = String(o.name ?? "").trim();
    if (!PARAM_NAME.test(pname)) throw new HttpError(400, `Parameter "${pname}" must be lowercase letters, digits or _ and start with a letter.`, "params");
    return { name: pname, description: String(o.description ?? "").trim().slice(0, 200), required: o.required !== false };
  });
  if (new Set(params.map((p) => p.name)).size !== params.length) throw new HttpError(400, "Parameter names must be unique.", "params");
  for (const m of url_template.matchAll(/\{([^}]*)\}/g)) {
    if (!params.some((p) => p.name === m[1])) throw new HttpError(400, `{${m[1]}} in the URL is not a parameter.`, "url_template");
  }

  let headers_enc: string | null | undefined;
  if (Array.isArray(body.headers)) {
    const entries = (body.headers as unknown[])
      .map((h) => (h ?? {}) as Record<string, unknown>)
      .map((h) => [String(h.name ?? "").trim(), String(h.value ?? "")] as const)
      .filter(([k]) => k);
    if (entries.length > 10) throw new HttpError(400, "Up to 10 headers.", "headers");
    const bad = entries.find(([k, v]) => !HEADER_NAME.test(k) || /[\r\n]/.test(v) || v.length > 2000);
    if (bad) throw new HttpError(400, `Header "${bad[0]}" is not valid.`, "headers");
    headers_enc = entries.length ? encrypt(JSON.stringify(Object.fromEntries(entries))) : null;
  }
  return { name, description, kind, method, url_template, params, sheet_match: null, headers_enc };
}
