import { memo, useState, useCallback } from "react";
import {
  Terminal,
  CheckCircle,
  Zap,
  Loader2,
  XCircle,
  AlertCircle,
  Clock,
  Lightbulb,
} from "lucide-react";
import type { VerdictResult } from "@/shared/types";
import { TestCaseStatusGrid } from "./TestCaseStatusGrid";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

type ConsoleTab = "result" | "executed" | "hint";

interface TabDef {
  key: ConsoleTab;
  label: string;
  icon: typeof Terminal;
}

const TABS: TabDef[] = [
  { key: "result", label: "Test Result", icon: CheckCircle },
  { key: "executed", label: "Judge's Result", icon: Zap },
  { key: "hint", label: "AI Hint", icon: Lightbulb },
];

interface ConsolePanelProps {
  verdict: VerdictResult | null;
  isRunning: boolean;
  totalTestCases: number;
  // Hint props
  hints: string[];
  hintLevel: number;
  isHintExhausted: boolean;
  isLoadingHint: boolean;
  hintError: string | null;
  onFetchHint: () => void;
}

export const ConsolePanel = memo(function ConsolePanel({
  verdict,
  isRunning,
  totalTestCases,
  // Hint props
  hints,
  hintLevel,
  isHintExhausted,
  isLoadingHint,
  hintError,
  onFetchHint,
}: ConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("result");

  const handleTabChange = useCallback((tab: ConsoleTab) => {
    setActiveTab(tab);
  }, []);

  const isAccepted = verdict?.status === "Accepted";
  const totalTestsZero = totalTestCases === 0;
  const testCaseResults = verdict?.test_case_results || [];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tab bar — more visible, pill-style */}
      <div className="flex items-center px-3 pt-2 pb-0">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/60">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeTab === "result" && (
          <div className="space-y-4">
            {isRunning ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2
                  className="h-8 w-8 text-muted-foreground animate-spin mb-3"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Running test cases...
                </p>
              </div>
            ) : verdict ? (
              <div className="space-y-4">
                {totalTestsZero && isAccepted ? (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <AlertCircle
                      className="h-12 w-12 text-warning mb-3"
                      aria-hidden
                    />
                    <h3 className="text-lg font-semibold text-warning mb-2">
                      No Test Cases
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This problem does not have any test cases configured.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className={`p-4 rounded-xl border ${
                        isAccepted
                          ? "bg-success/10 border-success/50"
                          : "bg-destructive/10 border-destructive/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isAccepted ? (
                          <CheckCircle
                            className="h-5 w-5 text-success"
                            aria-hidden
                          />
                        ) : (
                          <XCircle
                            className="h-5 w-5 text-destructive"
                            aria-hidden
                          />
                        )}
                        <span
                          className={`font-semibold ${
                            isAccepted ? "text-success" : "text-destructive"
                          }`}
                        >
                          {verdict.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Passed {verdict.passed_test_cases}/
                        {verdict.total_test_cases} test cases
                      </div>
                      {verdict.runtime_ms != null && (
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            Runtime: {verdict.runtime_ms}ms
                          </span>
                          {verdict.memory_kb != null && (
                            <span>Memory: {verdict.memory_kb} KB</span>
                          )}
                        </div>
                      )}
                    </div>

                    {testCaseResults.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground/80 mb-2">
                          All Test Cases
                        </h4>
                        <TestCaseStatusGrid testCases={testCaseResults} />
                      </div>
                    )}
                  </>
                )}

                {verdict.error_message && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-sm text-destructive">
                    {verdict.error_message}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Terminal className="h-10 w-10 mb-3" aria-hidden />
                <p className="text-sm">Run code to see test results</p>
              </div>
            )}
          </div>
        )}
        {activeTab === "executed" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground/80">
              Execution Details
            </h4>
            {verdict ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/60">
                    <span className="text-muted-foreground block">Status</span>
                    <span
                      className={`font-medium ${
                        isAccepted ? "text-success" : "text-destructive"
                      }`}
                    >
                      {verdict.status}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/60">
                    <span className="text-muted-foreground block">Runtime</span>
                    <span className="font-medium text-foreground">
                      {verdict.runtime_ms ?? "N/A"}ms
                    </span>
                  </div>
                </div>
                {verdict.stdout && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">
                      Stdout
                    </span>
                    <pre className="p-3 bg-muted/50 rounded-lg border border-border/60 text-xs font-mono text-foreground/80 whitespace-pre-wrap overflow-auto">
                      {verdict.stdout}
                    </pre>
                  </div>
                )}
                {verdict.stderr && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">
                      Stderr
                    </span>
                    <pre className="p-3 bg-destructive/10 rounded-lg border border-destructive/50 text-xs font-mono text-destructive whitespace-pre-wrap overflow-auto">
                      {verdict.stderr}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No execution data yet
              </p>
            )}
          </div>
        )}

        {activeTab === "hint" && (
          <div className="space-y-3">
            {!verdict?.submission_id || verdict?.status === "Accepted" ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {verdict?.status === "Accepted" 
                  ? "Problem accepted. No hints needed."
                  : "Submit to get AI hints."}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-warning" />
                    <h4 className="text-sm font-semibold text-foreground">
                      AI Hint
                    </h4>
                  </div>
                  {!isHintExhausted && hintLevel < 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onFetchHint}
                      disabled={isLoadingHint}
                      className="text-xs border-warning/30 hover:bg-warning/10"
                    >
                      {isLoadingHint ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Loading...
                        </>
                      ) : hintLevel === 0 ? (
                        "Get Hint"
                      ) : (
                        `Next Hint (${hintLevel}/3)`
                      )}
                    </Button>
                  )}
                </div>
                
                {hintError && (
                  <Alert variant="destructive" className="text-xs">
                    <AlertDescription>{hintError}</AlertDescription>
                  </Alert>
                )}
                
                {hints.length > 0 && (
                  <div className="space-y-3">
                    {hints.map((hint, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-card border border-border/60"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-warning">
                            Hint {index + 1}/3
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                          {hint}
                        </p>
                      </div>
                    ))}
                    {isHintExhausted && (
                      <p className="text-xs text-muted-foreground text-center">
                        All hints displayed for this submission. Submit new code to get fresh hints!
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
