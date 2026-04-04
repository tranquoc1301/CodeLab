import { memo, useState, useCallback } from "react";
import {
  Terminal,
  CheckCircle,
  Zap,
  Loader2,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { VerdictResult } from "@/types";
import { TestCaseStatusGrid } from "./TestCaseStatusGrid";

type ConsoleTab = "result" | "executed";

interface TabDef {
  key: ConsoleTab;
  label: string;
  icon: typeof Terminal;
}

const TABS: TabDef[] = [
  { key: "result", label: "Test Result", icon: CheckCircle },
  { key: "executed", label: "Judge's Result", icon: Zap },
];

interface ConsolePanelProps {
  verdict: VerdictResult | null;
  isRunning: boolean;
  totalTestCases: number;
}

export const ConsolePanel = memo(function ConsolePanel({
  verdict,
  isRunning,
  totalTestCases,
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
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
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
      </div>
    </div>
  );
});
