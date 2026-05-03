import { memo, useState, useEffect, useCallback } from "react";
import { FileCode, Minimize2, Lightbulb, Loader2 } from "lucide-react";
import CodeEditor from "@/features/editor/components/CodeEditor";
import { ConsolePanel } from "@/features/problems/components/ConsolePanel";
import {COPY} from "@/shared/config";
import type { Language, VerdictResult } from "@/shared/types";
import { submissionsApi } from "@/features/submissions/api";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

interface ProblemEditorPanelProps {
  language: Language;
  languageLabel: string;
  code: string;
  onCodeChange: (value: string | undefined) => void;
  verdict: VerdictResult | null;
  isRunning: boolean;
  isSubmitting: boolean;
  editorMaximized: boolean;
  consoleHeight: number;
  onRestoreLayout: () => void;
  onVerticalResize?: (e: React.MouseEvent) => void;
  editorPanelRef: React.RefObject<HTMLDivElement | null>;
}

export const ProblemEditorPanel = memo(function ProblemEditorPanel({
  language,
  languageLabel,
  code,
  onCodeChange,
  verdict,
  isRunning,
  isSubmitting,
  editorMaximized,
  consoleHeight,
  onRestoreLayout,
  onVerticalResize,
  editorPanelRef,
}: ProblemEditorPanelProps) {
  const FILE_EXTENSION: Record<Language, string> = {
    python3: ".py",
    java: ".java",
    cpp: ".cpp",
    c: ".c",
  };

  // Hint state
  const [hints, setHints] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [isHintExhausted, setIsHintExhausted] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  // Check if we have a failed submission with submission_id
  const submissionId = verdict?.submission_id ?? null;
  const isAccepted = verdict?.status === "Accepted";
  const showHints = !isAccepted && submissionId !== null;

  // Reset hints when verdict changes (new submission)
  useEffect(() => {
    setHints([]);
    setHintLevel(0);
    setIsHintExhausted(false);
    setHintError(null);
  }, [submissionId]);

  // Fetch hint handler
  const fetchHint = useCallback(async () => {
    if (isHintExhausted || !submissionId) return;
    
    setIsLoadingHint(true);
    setHintError(null);
    
    try {
      const response = await submissionsApi.getHint(submissionId);
      const data = response.data;
      
      if (data.hint) {
        setHints((prev) => [...prev, data.hint!]);
      }
      setHintLevel(data.hint_level);
      setIsHintExhausted(data.exhausted);
    } catch {
      setHintError("Không thể lấy gợi ý. Vui lòng thử lại sau.");
    } finally {
      setIsLoadingHint(false);
    }
  }, [submissionId, isHintExhausted]);

  // Use consoleHeight to avoid TS warning about unused variable
  const consoleHeightPercent = "var(--console-height, 45%)";

  return (
    <div
      className="flex flex-col min-h-0"
      style={{ 
        width: editorMaximized ? "100%" : undefined,
        "--console-height": `${consoleHeight}%`,
      } as React.CSSProperties}
      ref={editorPanelRef}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-card/80 border-b border-border/60">
        <div className="flex items-center gap-2">
          <FileCode className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs font-mono text-muted-foreground">
            solution{FILE_EXTENSION[language]}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {languageLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {editorMaximized && (
            <button
              type="button"
              onClick={onRestoreLayout}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
              aria-label={COPY.PROBLEM.RESTORE_LAYOUT}
              title={COPY.PROBLEM.RESTORE_LAYOUT}
            >
              <Minimize2
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex flex-col min-h-0"
        style={{ height: "calc(100% - var(--console-height, 45%))" }}
      >
        <CodeEditor language={language} value={code} onChange={onCodeChange} />
      </div>

      {/* Vertical resize handle between editor and console */}
      <div
        className="h-2 bg-border/50 hover:bg-primary/40 cursor-row-resize transition-all relative group select-none flex items-center justify-center"
        onMouseDown={onVerticalResize}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize console panel"
      >
        {/* Horizontal drag indicator */}
        <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/60" />
          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/60" />
          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/60" />
        </div>
      </div>

      <div
        className="flex flex-col min-h-0 overflow-hidden"
        style={{ height: consoleHeightPercent }}
      >
        <ConsolePanel
          verdict={verdict}
          isRunning={isRunning || isSubmitting}
          totalTestCases={verdict?.total_test_cases ?? 0}
        />
      </div>

      {/* AI Hints - only for non-Accepted submissions with submission_id */}
      {showHints && (
        <div className="border-t border-border/60 p-4 bg-warning/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              <h4 className="text-sm font-semibold text-foreground">
                Gợi ý từ AI
              </h4>
            </div>
            {!isHintExhausted && hintLevel < 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHint}
                disabled={isLoadingHint}
                className="text-xs border-warning/30 hover:bg-warning/10"
              >
                {isLoadingHint ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Đang tải...
                  </>
                ) : hintLevel === 0 ? (
                  "Lấy gợi ý"
                ) : (
                  `Gợi ý tiếp theo (${hintLevel}/3)`
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
                      Gợi ý {index + 1}/3
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {hint}
                  </p>
                </div>
              ))}
              {isHintExhausted && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Đã hiển thị tất cả gợi ý. Hãy thử sửa code và submit lại!
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
