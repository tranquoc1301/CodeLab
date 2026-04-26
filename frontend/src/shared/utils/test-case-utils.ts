/**
 * Test case formatting utilities
 * Shared helpers for TestCaseResultItem and TestCaseStatusGrid
 */

export function tryParseJSON(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}