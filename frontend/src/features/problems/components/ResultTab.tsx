import { Terminal, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import type { VerdictResult } from "@/shared/types";
import { TestCaseStatusGrid } from "./TestCaseStatusGrid";

interface ResultTabProps {
  verdict: VerdictResult | null;
  isRunning: boolean;
  totalTestCases: number;
}

export function ResultTab({ verdict, isRunning, totalTestCases }: ResultTabProps) {
  const isAccepted = verdict?.status === "Accepted";
  const totalTestsZero = totalTestCases === 0;
  const testCaseResults = verdict?.test_case_results || [];

  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Clock className="h-8 w-8 text-muted-foreground animate-spin mb-3" aria-hidden />
        <p className="text-sm text-muted-foreground">Running test cases...</p>
      </div>
    );
  }

  if (!verdict) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Terminal className="h-10 w-10 mb-3" aria-hidden />
        <p className="text-sm">Run code to see test results</p>
      </div>
    );
  }

  if (totalTestsZero && isAccepted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <AlertCircle className="h-12 w-12 text-warning mb-3" aria-hidden />
        <h3 className="text-lg font-semibold text-warning mb-2">No Test Cases</h3>
        <p className="text-sm text-muted-foreground">
          This problem does not have any test cases configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl border ${
        isAccepted
          ? "bg-success/10 border-success/50"
          : "bg-destructive/10 border-destructive/50"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {isAccepted ? (
            <CheckCircle className="h-5 w-5 text-success" aria-hidden />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" aria-hidden />
          )}
          <span className={`font-semibold ${isAccepted ? "text-success" : "text-destructive"}`}>
            {verdict.status}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Passed {verdict.passed_test_cases}/{verdict.total_test_cases} test cases
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
          <h4 className="text-sm font-medium text-foreground/80 mb-2">All Test Cases</h4>
          <TestCaseStatusGrid testCases={testCaseResults} />
        </div>
      )}

      {verdict.error_message && (
        <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-sm text-destructive">
          {verdict.error_message}
        </div>
      )}
    </div>
  );
}
