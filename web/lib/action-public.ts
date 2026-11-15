import { decrypt } from "./crypto";
import type { ApiAction } from "./actions";

export type ApiActionRow = ApiAction & { created_at: Date };

/** What the dashboard may see: header NAMES only, never their values. */
export type PublicAction = Omit<ApiAction, "headers_enc"> & { header_names: string[] };

export function publicAction(a: ApiActionRow): PublicAction {
  let header_names: string[] = [];
  if (a.headers_enc) {
    try {
      header_names = Object.keys(JSON.parse(decrypt(a.headers_enc)) as Record<string, string>);
    } catch {
      header_names = ["(unreadable: re-enter headers)"];
    }
  }
  const { headers_enc: _h, created_at: _c, ...rest } = a;
  void _h;
  void _c;
  return { ...rest, header_names };
}
