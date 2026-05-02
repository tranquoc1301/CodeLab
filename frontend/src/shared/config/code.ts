import type { Language } from "@/shared/types/language";
import { COPY } from "./copy";

/**
 * Retrieves code template for a given language.
 * Priority: 1) Use provided template from config, 2) Use fallback from copy config.
 */
export function getCodeTemplate(language: Language): string {
  const template = COPY.CODE_TEMPLATES[language];
  if (template) {
    return template;
  }
  return "";
}

/**
 * Gets saved code from localStorage or returns default template.
 * Storage key format: code-{userId}-{slug}-{language}
 */
export function getSavedCode(slug: string | undefined, language: Language, userId: number | undefined): string | null {
  if (!slug) return null;
  const key = userId ? `code-${userId}-${slug}-${language}` : `code-guest-${slug}-${language}`;
  return localStorage.getItem(key);
}

/**
 * Saves code to localStorage.
 * Storage key format: code-{userId}-{slug}-{language}
 */
export function saveCode(slug: string | undefined, language: Language, code: string, userId: number | undefined): void {
  if (!slug) return;
  const key = userId ? `code-${userId}-${slug}-${language}` : `code-guest-${slug}-${language}`;
  localStorage.setItem(key, code);
}

/**
 * Resolves code for a problem: checks code snippets, saved code, or falls back to template.
 */
export function resolveCode(
  problem: { code_snippets?: { language: string; code: string }[] } | undefined,
  slug: string | undefined,
  language: Language,
  userId: number | undefined,
): string {
  // User's saved edits take priority over the DB snippet
  if (slug) {
    const key = userId ? `code-${userId}-${slug}-${language}` : `code-guest-${slug}-${language}`;
    const savedCode = localStorage.getItem(key);
    if (savedCode) {
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
