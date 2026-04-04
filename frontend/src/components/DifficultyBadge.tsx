import { cn } from "@/lib/utils";

interface DifficultyBadgeProps {
  difficulty: string;
  className?: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-easy-bg text-easy",
  Medium: "bg-medium-bg text-medium",
  Hard: "bg-hard-bg text-hard",
} as const;

const DIFFICULTY_COLORS_FALLBACK = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const colorClass = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS_FALLBACK;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ease-out",
        colorClass,
        className,
      )}
    >
      {difficulty}
    </span>
  );
}
