// Languages offered in the UI (business default, agent language). Buyers may write in any language.
export const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "id", label: "Indonesian" },
] as const;

export const isLang = (v: unknown): v is string => LANGS.some((l) => l.code === v);

/** "es-MX" -> "es" */
export const baseLang = (code: string) => code.toLowerCase().split(/[-_]/)[0] || "en";

/** English name for a language code, e.g. "es" -> "Spanish". Falls back to the code. */
export function langName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
