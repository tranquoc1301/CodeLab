import * as React from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type StrengthLevel = "weak" | "fair" | "good" | "strong";

interface StrengthMetric {
  level: StrengthLevel;
  label: string;
  color: string;
  bgColor: string;
  score: number;
}

const calculateStrength = (password: string): StrengthMetric => {
  let score = 0;

  if (!password) return { level: "weak", label: "Very Weak", color: "text-destructive", bgColor: "bg-destructive", score: 0 };

  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Complexity checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Determine level based on score
  if (score <= 2) return { level: "weak", label: "Weak", color: "text-destructive", bgColor: "bg-destructive", score };
  if (score === 3) return { level: "fair", label: "Fair", color: "text-warning", bgColor: "bg-warning", score };
  if (score === 4) return { level: "good", label: "Good", color: "text-info", bgColor: "bg-info", score };
  return { level: "strong", label: "Strong", color: "text-success", bgColor: "bg-success", score };
};

export const PasswordStrength = React.forwardRef<HTMLDivElement, PasswordStrengthProps>(
  ({ password, className }, ref) => {
    const strength = React.useMemo(() => calculateStrength(password), [password]);

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn("font-medium", strength.color)}>{strength.label}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all duration-300 ease-out", strength.bgColor)}
            style={{ width: `${Math.min((strength.score / 6) * 100, 100)}%` }}
            role="progressbar"
            aria-valuenow={strength.score}
            aria-valuemin={0}
            aria-valuemax={6}
            aria-label={`Password strength: ${strength.label}`}
          />
        </div>
        {password && (
          <ul className="text-xs space-y-1 text-muted-foreground" aria-label="Password requirements">
            <li className={cn(password.length >= 8 ? "text-foreground" : "")}>
              {password.length >= 8 ? "✓" : "○"} At least 8 characters
            </li>
            <li className={cn(/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-foreground" : "")}>
              {/[a-z]/.test(password) && /[A-Z]/.test(password) ? "✓" : "○"} Upper and lowercase letters
            </li>
            <li className={cn(/[0-9]/.test(password) ? "text-foreground" : "")}>
              {/[0-9]/.test(password) ? "✓" : "○"} At least one number
            </li>
            <li className={cn(/[^a-zA-Z0-9]/.test(password) ? "text-foreground" : "")}>
              {/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"} Special character
            </li>
          </ul>
        )}
      </div>
    );
  },
);
PasswordStrength.displayName = "PasswordStrength";
