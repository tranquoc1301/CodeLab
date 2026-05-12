import type { Language } from "@/shared/types/language";
import { COPY } from "./copy";

export function getCodeTemplate(language: Language): string {
  const template = COPY.CODE_TEMPLATES[language];
  if (template) {
    return template;
  }
  return "";
}

export function getSavedCode(slug: string | undefined, language: Language, userId: number | undefined): string | null {
  if (!slug) return null;
  const key = userId ? `code-${userId}-${slug}-${language}` : `code-guest-${slug}-${language}`;
  return localStorage.getItem(key);
}

export function saveCode(slug: string | undefined, language: Language, code: string, userId: number | undefined): void {
  if (!slug) return;
  const key = userId ? `code-${userId}-${slug}-${language}` : `code-guest-${slug}-${language}`;
  localStorage.setItem(key, code);
}

export function resolveCode(
  problem: { code_snippets?: { language: string; code: string }[] } | undefined,
  slug: string | undefined,
  language: Language,
  userId: number | undefined,
): string {
  if (slug) {
    const key = userId ? `code-${userId}-${slug}-${language}` : `code-guest-${slug}-${language}`;
    const savedCode = localStorage.getItem(key);
    if (savedCode !== null) {
      return savedCode;
    }
  }

  if (problem) {
    const snippet = problem.code_snippets?.find((cs) => cs.language === language);
    if (snippet) {
      return snippet.code;
    }
  }

  return getCodeTemplate(language);
}
