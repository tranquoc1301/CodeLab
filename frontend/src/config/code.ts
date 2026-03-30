import type { Language } from "@/types/language";
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
 * Storage key format: code-{slug}-{language}
 */
export function getSavedCode(slug: string | undefined, language: Language): string | null {
  if (!slug) return null;
  return localStorage.getItem(`code-${slug}-${language}`);
}

/**
 * Saves code to localStorage.
 * Storage key format: code-{slug}-{language}
 */
export function saveCode(slug: string | undefined, language: Language, code: string): void {
  if (!slug) return;
  localStorage.setItem(`code-${slug}-${language}`, code);
}

/**
 * Resolves code for a problem: checks code snippets, saved code, or falls back to template.
 */
export function resolveCode(
  problem: { code_snippets?: { language: string; code: string }[] } | undefined,
  slug: string | undefined,
  language: Language,
): string {
  if (problem) {
    const snippet = problem.code_snippets?.find((cs) => cs.language === language);
    if (snippet) {
      return snippet.code;
    }
  }

  if (slug) {
    const savedCode = localStorage.getItem(`code-${slug}-${language}`);
    if (savedCode) {
      return savedCode;
    }
  }

  return getCodeTemplate(language);
}
