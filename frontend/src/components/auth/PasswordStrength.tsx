import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

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
  gradient: string;
  score: number;
}

interface Requirement {
  met: boolean;
  label: string;
  test: (pwd: string) => boolean;
}

const calculateStrength = (password: string): StrengthMetric => {
  let score = 0;

  if (!password)
    return {
      level: "weak",
      label: "Enter password",
      color: "text-slate-500",
      bgColor: "bg-slate-200",
      gradient: "from-slate-300 to-slate-400",
      score: 0,
    };

  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Complexity checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Determine level based on score
  if (score <= 2)
    return {
      level: "weak",
      label: "Weak",
      color: "text-red-500",
      bgColor: "bg-red-500",
      gradient: "from-red-400 to-red-500",
      score,
    };
  if (score === 3)
    return {
      level: "fair",
      label: "Fair",
      color: "text-amber-500",
      bgColor: "bg-amber-500",
      gradient: "from-amber-400 to-orange-500",
      score,
    };
  if (score === 4)
    return {
      level: "good",
      label: "Good",
      color: "text-blue-500",
      bgColor: "bg-blue-500",
      gradient: "from-blue-400 to-cyan-500",
      score,
    };
  return {
    level: "strong",
    label: "Strong",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    gradient: "from-emerald-400 to-green-500",
    score,
  };
};

const requirements: Requirement[] = [
  { met: false, label: "At least 8 characters", test: (p) => p.length >= 8 },
  {
    met: false,
    label: "Contains uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    met: false,
    label: "Contains lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  { met: false, label: "Contains a number", test: (p) => /[0-9]/.test(p) },
  {
    met: false,
    label: "Contains special character",
    test: (p) => /[^a-zA-Z0-9]/.test(p),
  },
];

export const PasswordStrength = React.forwardRef<
  HTMLDivElement,
  PasswordStrengthProps
>(({ password, className }, ref) => {
  const strength = React.useMemo(() => calculateStrength(password), [password]);
  const metRequirements = React.useMemo(
    () => requirements.map((req) => ({ ...req, met: req.test(password) })),
    [password],
  );
  const metCount = metRequirements.filter((r) => r.met).length;

  // Gradient colors based on strength
  const gradientColors: Record<StrengthLevel, string> = {
    weak: "#ef4444",
    fair: "#f97316",
    good: "#06b6d4",
    strong: "#22c55e",
  };

  return (
    <div ref={ref} className={cn("space-y-3", className)}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 font-medium">Password strength</span>
          <span className={cn("font-semibold", strength.color)}>
            {strength.label}
          </span>
        </div>
        <div className="relative h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
            )}
            style={{
              width: password
                ? `${Math.min((strength.score / 6) * 100, 100)}%`
                : "0%",
              backgroundColor: gradientColors[strength.level],
            }}
            role="progressbar"
            aria-valuenow={strength.score}
            aria-valuemin={0}
            aria-valuemax={6}
            aria-label={`Password strength: ${strength.label}`}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {password && (
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Requirements ({metCount}/5)
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {metRequirements.map((req, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 text-sm transition-colors duration-200",
                  req.met ? "text-emerald-700" : "text-slate-500",
                )}
              >
                {req.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                )}
                <span className={cn("text-xs", req.met && "font-medium")}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {password && strength.score < 3 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Your password could be stronger. Add more characters and mix
            letters, numbers, and symbols.
          </p>
        </div>
      )}
    </div>
  );
});
PasswordStrength.displayName = "PasswordStrength";
