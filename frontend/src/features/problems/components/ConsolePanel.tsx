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
import type { HintResponse, VerdictResult } from "@/shared/types";
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
const TUTOR_JOURNEY_LABEL = "Quan sát lỗi -> Khoanh vùng -> Hướng sửa";
const DIAGNOSIS_LABELS: Record<string, string> = {
  logic_calculation_error: "Logic & Calculation Error",
  complexity_error: "Complexity & TLE Error",
  memory_reference_error: "Memory & Reference Error",
  recursion_error: "Recursion Error",
  algorithm_design_error: "Algorithm Design Error",
  boundary_condition_error: "Boundary & Edge Case Error",
  unknown: "Chưa đủ tín hiệu",
};
const DIAGNOSIS_DETAIL_LABELS: Record<string, string> = {
  compile_syntax: "Lỗi biên dịch",
  wrong_answer_boundary: "Sai điều kiện biên",
  wrong_answer_state_index: "Sai chỉ số/trạng thái",
  wrong_answer_parsing_format: "Sai định dạng đầu ra",
  runtime_reference_type: "Lỗi truy cập dữ liệu",
  runtime_recursion: "Lỗi đệ quy",
  tle_complexity: "Thuật toán quá chậm",
  logic_calculation: "Sai logic/tính toán",
  algorithm_design: "Sai thiết kế thuật toán",
  unknown: "Chưa đủ tín hiệu",
};

interface ConsolePanelProps {
  verdict: VerdictResult | null;
  isRunning: boolean;
  totalTestCases: number;
  hints: HintResponse[];
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
  const latestHint = hints[hints.length - 1] ?? null;

  return (
    <div className="flex flex-col h-full bg-background">
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

      <div
        className="flex-1 overflow-y-auto scrollbar-thin p-4"
        style={{ minHeight: 0, display: "flex", flexDirection: "column" }}
      >
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
                  ? "Bài đã Accepted, không cần hint thêm."
                  : "Hãy submit bài để nhận chuỗi AI Hint 3 mức."}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-warning" />
                    <h4 className="text-sm font-semibold text-foreground">
                      AI Tutor Hint
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
                          Đang tạo hint...
                        </>
                      ) : hintLevel === 0 ? (
                        "Nhận gợi ý đầu tiên"
                      ) : (
                        `Mở mức tiếp theo (${hintLevel}/3)`
                      )}
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">
                        Lộ trình tutor 3 mức
                      </p>
                      <p className="mt-1 text-sm text-foreground/80">
                        {TUTOR_JOURNEY_LABEL}
                      </p>
                    </div>
                    <span className="rounded-full border border-warning/30 bg-background px-2.5 py-1 text-xs font-medium text-warning">
                      Mức {hintLevel}/3
                    </span>
                  </div>
                  {latestHint?.diagnosis_label && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Chẩn đoán hiện tại:{" "}
                      {formatDiagnosisLabel(latestHint.diagnosis_label)}
                      {latestHint.diagnosis_detail && (
                        <> · {formatDiagnosisDetail(latestHint.diagnosis_detail)}</>
                      )}
                    </p>
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
                      <HintStepCard key={`${hint.stage}-${index}`} hint={hint} index={index} />
                    ))}
                    {isHintExhausted && (
                      <p className="text-xs text-muted-foreground text-center">
                        Đã dùng hết 3 mức gợi ý cho lần submit này. Hãy submit phiên bản code mới để bắt đầu chuỗi hint mới.
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

function HintStepCard({
  hint,
  index,
}: {
  hint: HintResponse;
  index: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">
            {stageLabel(hint.stage)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Mức {index + 1}/3
          </p>
        </div>
        {hint.diagnosis_label && (
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
              {formatDiagnosisLabel(hint.diagnosis_label)}
            </span>
            {hint.diagnosis_detail && (
              <span className="text-[11px] text-muted-foreground">
                {formatDiagnosisDetail(hint.diagnosis_detail)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2.5">
        {hint.cards.map((card) => (
          <div
            key={`${hint.stage}-${card.label}`}
            className="rounded-lg border border-border/50 bg-background p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {card.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function stageLabel(stage: HintResponse["stage"]) {
  if (stage === "observe") return "Quan sát lỗi";
  if (stage === "focus") return "Khoanh vùng";
  return "Hướng sửa";
}

function formatDiagnosisLabel(label: string) {
  return DIAGNOSIS_LABELS[label] ?? label;
}

function formatDiagnosisDetail(detail: string) {
  return DIAGNOSIS_DETAIL_LABELS[detail] ?? detail;
}
