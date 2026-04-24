import { memo } from "react";
import {
  ArrowLeft,
  Clock,
  Zap,
  HardDrive,
  FileCode,
  XCircle,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import type { SubmissionResult } from "@/types";
import { getStatusConfig } from "@/config/status";
import { EDITOR } from "@/config";
import { useThemeStore } from "@/store/theme";

interface SubmissionDetailProps {
  submission: SubmissionResult;
  onBack: () => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  python3: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
};

function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    python3: "Python 3",
    java: "Java",
    cpp: "C++",
    c: "C",
  };
  return labels[language] || language;
}

export const SubmissionDetail = memo(function SubmissionDetail({
  submission,
  onBack,
}: SubmissionDetailProps) {
  const statusConfig = getStatusConfig(submission.status);
  const StatusIcon = statusConfig.icon;
  const { theme } = useThemeStore();
  const isAccepted = submission.status === "Accepted";
  const progressPercent =
    submission.passed_count != null &&
    submission.total_count != null &&
    submission.total_count > 0
      ? (submission.passed_count / submission.total_count) * 100
      : 0;

  // Format datetime
  const formattedDate = new Date(submission.created_at).toLocaleString();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-card/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </button>
          <span className="text-xs text-muted-foreground/60">
            #{submission.id}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.class}`}
        >
          <StatusIcon className="h-3 w-3" />
          {submission.status || "Pending"}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border/40 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Zap className="h-3.5 w-3.5" />
          {submission.execution_time_ms != null
            ? `${submission.execution_time_ms} ms`
            : "—"}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5" />
          {submission.memory_used_kb != null
            ? `${submission.memory_used_kb} KB`
            : "—"}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <FileCode className="h-3.5 w-3.5" />
          {getLanguageLabel(submission.language)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground ml-auto">
          <Clock className="h-3.5 w-3.5" />
          {formattedDate}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Test case progress */}
        {submission.total_count != null && submission.total_count > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                Test Cases
              </span>
              <span className="text-muted-foreground">
                {submission.passed_count ?? 0} / {submission.total_count} passed
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isAccepted ? "bg-green-500" : "bg-red-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Test case results list - only failed test cases */}
        {submission.test_case_results &&
          submission.test_case_results.length > 0 && (
            <div className="space-y-3">
              {(() => {
                const failedCases = submission.test_case_results.filter(
                  (tc) => tc.status !== "Accepted",
                );
                if (failedCases.length === 0) return null;

                return (
                  <>
                    {/* Section header */}
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                      <h4 className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                        Failed Test Cases
                      </h4>
                      <span className="ml-auto rounded-full bg-rose-100 dark:bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25">
                        {failedCases.length} failed
                      </span>
                    </div>

                    <div className="space-y-3">
                      {failedCases.map((tc, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm"
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between px-3.5 py-2 bg-muted/50 border-b border-border/60">
                            <span className="text-xs font-semibold text-foreground">
                              Case #{tc.index + 1}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25">
                              <XCircle className="h-3 w-3" />
                              {tc.status}
                            </span>
                          </div>

                          <div className="p-3.5 space-y-3">
                            {/* Expected Output */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                                  Expected
                                </p>
                              </div>
                              <pre
                                className="rounded-md
                      bg-emerald-50 border-emerald-200 text-emerald-800
                      dark:bg-emerald-950/50 dark:border-emerald-800/40 dark:text-emerald-200
                      border px-3 py-2.5 text-xs font-mono whitespace-pre-wrap leading-relaxed"
                              >
                                {tc.expected_output || "(empty)"}
                              </pre>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-border/50" />
                              <span className="text-[10px] text-muted-foreground/50 font-mono">
                                vs
                              </span>
                              <div className="flex-1 h-px bg-border/50" />
                            </div>

                            {/* Actual Output */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 tracking-wide uppercase">
                                  Your Output
                                </p>
                              </div>
                              <pre
                                className="rounded-md
                      bg-rose-50 border-rose-200 text-rose-800
                      dark:bg-rose-950/50 dark:border-rose-800/40 dark:text-rose-200
                      border px-3 py-2.5 text-xs font-mono whitespace-pre-wrap leading-relaxed"
                              >
                                {tc.stdout || "(empty)"}
                              </pre>
                            </div>

                            {/* Stderr nếu có */}
                            {tc.stderr && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 tracking-wide uppercase">
                                    Error
                                  </p>
                                </div>
                                <pre
                                  className="rounded-md
                        bg-amber-50 border-amber-200 text-amber-800
                        dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-200
                        border px-3 py-2.5 text-xs font-mono whitespace-pre-wrap leading-relaxed"
                                >
                                  {tc.stderr}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        {/* Source code */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Code</h4>
          <div className="h-[300px] border border-border/60 rounded-md overflow-hidden">
            <Editor
              height="300px"
              language={
                LANGUAGE_MAP[submission.language] || submission.language
              }
              value={submission.source_code}
              theme={EDITOR.THEME[theme]}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                fontSize: 13,
                padding: {
                  top: 12,
                  bottom: 12,
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
