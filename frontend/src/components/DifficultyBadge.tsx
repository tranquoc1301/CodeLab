import { cn } from "@/lib/utils";

interface DifficultyBadgeProps {
  difficulty: string;
  className?: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
} as const;

const DIFFICULTY_COLORS_FALLBACK = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const colorClass = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS_FALLBACK;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClass,
        className,
      )}
    >
      {difficulty}
    </span>
  );
}
