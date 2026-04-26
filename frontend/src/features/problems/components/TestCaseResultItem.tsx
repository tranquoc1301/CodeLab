import { memo } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { tryParseJSON, formatValue } from "@/shared/utils/test-case-utils";

interface TestCaseResultItemProps {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CodeBlock({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: string;
  variant?: "neutral" | "success" | "error";
}) {
  const variantClass = {
    neutral: "bg-muted/50 border-border text-foreground/80",
    success: "bg-success/10 border-success/50 text-success",
    error: "bg-destructive/10 border-destructive/50 text-destructive",
  }[variant];

  return (
    <div>
      <span className="block text-xs text-muted-foreground mb-1.5">
        {label}
      </span>
      <pre
        className={`px-3 py-2.5 rounded border font-mono text-xs whitespace-pre-wrap wrap-break-words leading-relaxed ${variantClass}`}
      >
        {value}
      </pre>
    </div>
  );
}

function InputSection({ raw }: { raw: string }) {
  const parsed = tryParseJSON(raw);

  if (parsed) {
    return (
      <div className="space-y-2">
        {Object.entries(parsed).map(([key, value]) => (
          <CodeBlock
            key={key}
            label={`${key} =`}
            value={formatValue(value)}
            variant="neutral"
          />
        ))}
      </div>
    );
  }

  return <CodeBlock label="Input" value={raw} variant="neutral" />;
}

// ── Main component ────────────────────────────────────────────────────────────

export const TestCaseResultItem = memo(function TestCaseResultItem({
  index,
  passed,
  input,
  expected,
  actual,
}: TestCaseResultItemProps) {
  return (
    <div className="space-y-3">
      {/* Status header */}
      <div className="flex items-center gap-2 text-sm">
        {passed ? (
          <CheckCircle className="h-4 w-4 text-success" aria-hidden />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" aria-hidden />
        )}
        <span className={passed ? "text-success" : "text-destructive"}>
          Case {index + 1}: {passed ? "Accepted" : "Wrong Answer"}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3 text-xs">
        <InputSection raw={input} />

        <CodeBlock
          label="Output"
          value={actual}
          variant={passed ? "success" : "error"}
        />

        {!passed && (
          <CodeBlock label="Expected" value={expected} variant="success" />
        )}
      </div>
    </div>
  );
});
