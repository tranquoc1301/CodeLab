import type { LucideIcon } from "lucide-react";
import { CheckCircle, XCircle, Clock } from "lucide-react";

/**
 * Configuration for submission status badges.
 * Uses a lookup table pattern for O(1) status resolution.
 */
export const SUBMISSION_STATUS_CONFIG: Record<string, { icon: LucideIcon; class: string }> = {
  Accepted: {
    icon: CheckCircle,
    class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  "Wrong Answer": {
    icon: XCircle,
    class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  "Time Limit Exceeded": {
    icon: Clock,
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  "Runtime Error": {
    icon: XCircle,
    class: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  "Compilation Error": {
    icon: XCircle,
    class: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
} as const;

/**
 * Fallback configuration for unknown submission statuses.
 */
export const SUBMISSION_STATUS_FALLBACK = {
  icon: Clock,
  class: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

/**
 * Gets the configuration for a given submission status.
 * Returns fallback config if status is not found.
 */
export function getStatusConfig(status: string | null) {
  return SUBMISSION_STATUS_CONFIG[status || ""] || SUBMISSION_STATUS_FALLBACK;
}
