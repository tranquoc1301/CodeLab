export const LANGUAGES = ["python3", "java", "cpp", "c"] as const;
export type LanguageValue = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<LanguageValue, string> = {
  python3: "Python 3",
  java: "Java",
  cpp: "C++",
  c: "C",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
