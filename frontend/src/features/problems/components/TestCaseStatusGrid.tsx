import { memo, useState, useMemo } from "react";
import { tryParseJSON, formatValue } from "@/shared/utils/test-case-utils";

interface TestCaseData {
  index: number;
  status: string;
  input?: string;
  stdout?: string;
  expected_output?: string;
  error_message?: string | null;
  time_ms?: number | null;
  memory_kb?: number | null;
}

interface TestCaseStatusGridProps {
  testCases: TestCaseData[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DataBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "error" | "success";
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </p>
      <pre
        className={`rounded-md px-3 py-2.5 text-xs font-mono whitespace-pre-wrap leading-relaxed
          ${
            highlight === "error"
              ? "bg-destructive/10 text-destructive border border-destructive/50"
              : highlight === "success"
                ? "bg-success/10 text-success border border-success/50"
                : "bg-muted/50 text-foreground border border-transparent"
          }`}
      >
        {value || "(empty)"}
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
          <DataBlock key={key} label={`${key} =`} value={formatValue(value)} />
        ))}
      </div>
    );
  }

  return <DataBlock label="Input" value={raw} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export const TestCaseStatusGrid = memo(function TestCaseStatusGrid({
  testCases,
}: TestCaseStatusGridProps) {
  const [selected, setSelected] = useState<number | null>(
    testCases.length > 0 ? testCases[0].index : null,
  );

  const selectedTC = useMemo(
    () =>
      selected !== null
        ? (testCases.find((tc) => tc.index === selected) ?? null)
        : null,
    [selected, testCases],
  );

  const isPassed = (tc: TestCaseData) => tc.status === "Accepted";

  return (
    <div className="flex flex-col gap-0">
      {/* ── Case tab pills ── */}
      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
        {testCases.map((tc) => {
          const passed = isPassed(tc);
          const isSelected = selected === tc.index;
          return (
            <button
              key={tc.index}
              onClick={() => setSelected(isSelected ? null : tc.index)}
              title={`Case ${tc.index + 1}: ${tc.status}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                whitespace-nowrap shrink-0 transition-all duration-150
                ${
                  isSelected
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  passed ? "bg-success" : "bg-destructive"
                }`}
              />
              Case {tc.index + 1}
            </button>
          );
        })}
      </div>

      {/* ── Selected case detail ── */}
      {selectedTC && (
        <div className="flex flex-col gap-3 px-4 pb-4 border-t border-border pt-3">
          <InputSection raw={selectedTC.input ?? ""} />

          <DataBlock
            label="Output"
            value={selectedTC.stdout ?? ""}
            highlight={isPassed(selectedTC) ? "success" : "error"}
          />

          <DataBlock
            label="Expected"
            value={selectedTC.expected_output ?? ""}
            highlight="success"
          />

          {selectedTC.error_message && selectedTC.status !== "Accepted" && (
            <DataBlock
              label="Error"
              value={selectedTC.error_message}
              highlight="error"
            />
          )}
        </div>
      )}
    </div>
  );
});
