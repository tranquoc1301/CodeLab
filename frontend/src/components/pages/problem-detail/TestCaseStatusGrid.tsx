import { memo, useState } from "react";

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

export const TestCaseStatusGrid = memo(function TestCaseStatusGrid({
  testCases,
}: TestCaseStatusGridProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedTC = selected !== null ? testCases.find(tc => tc.index === selected) : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {testCases.map((tc) => {
          const isPassed = tc.status === "Accepted";
          const isSelected = selected === tc.index;
          return (
            <button
              key={tc.index}
              type="button"
              onClick={() => setSelected(isSelected ? null : tc.index)}
              className={`flex items-center justify-center w-8 h-8 rounded text-xs font-medium transition-all cursor-pointer ${
                isPassed
                  ? "bg-success/10 border border-success/50 text-success hover:bg-success/20"
                  : "bg-destructive/10 border border-destructive/50 text-destructive hover:bg-destructive/20"
              } ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
              title={`Test Case ${tc.index + 1}: ${tc.status}`}
            >
              {tc.index + 1}
            </button>
          );
        })}
      </div>

      {selectedTC && (
        <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Test Case {selectedTC.index + 1}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              selectedTC.status === "Accepted"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}>
              {selectedTC.status}
            </span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block mb-1">Input</span>
            <pre className="p-2.5 bg-background rounded border border-border/60 font-mono text-xs text-foreground whitespace-pre-wrap overflow-auto max-h-32">
              {selectedTC.input || "(empty)"}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Expected Output</span>
              <pre className="p-2.5 bg-success/5 rounded border border-success/20 font-mono text-xs text-success whitespace-pre-wrap overflow-auto max-h-32">
                {selectedTC.expected_output || "(empty)"}
              </pre>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Your Output</span>
              <pre className={`p-2.5 rounded border font-mono text-xs whitespace-pre-wrap overflow-auto max-h-32 ${
                selectedTC.status === "Accepted"
                  ? "bg-success/5 border-success/20 text-success"
                  : "bg-destructive/5 border-destructive/20 text-destructive"
              }`}>
                {selectedTC.stdout || "(empty)"}
              </pre>
            </div>
          </div>

          {selectedTC.error_message && selectedTC.status !== "Accepted" && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Error</span>
              <pre className="p-2.5 bg-destructive/10 rounded border border-destructive/30 font-mono text-xs text-destructive whitespace-pre-wrap overflow-auto max-h-24">
                {selectedTC.error_message}
              </pre>
            </div>
          )}

          {(selectedTC.time_ms || selectedTC.memory_kb) && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              {selectedTC.time_ms != null && <span>Time: {selectedTC.time_ms}ms</span>}
              {selectedTC.memory_kb != null && <span>Memory: {selectedTC.memory_kb} KB</span>}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {testCases.filter((t) => t.status === "Accepted").length} /{" "}
          {testCases.length} passed
        </span>
      </div>
    </div>
  );
});
