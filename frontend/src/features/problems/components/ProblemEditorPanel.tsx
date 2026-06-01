import { memo, useState, useEffect, useCallback } from "react";
import { FileCode, Minimize2 } from "lucide-react";
import CodeEditor from "@/features/editor/components/CodeEditor";
import { ConsolePanel } from "@/features/problems/components/ConsolePanel";
import { COPY } from "@/shared/config";
import { FILE_EXTENSIONS } from "@/shared/config/editor";
import type { HintResponse, Language, VerdictResult } from "@/shared/types";
import { submissionsApi } from "@/features/submissions/api";

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
  const [hints, setHints] = useState<HintResponse[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [isHintExhausted, setIsHintExhausted] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const submissionId = verdict?.submission_id ?? null;

  useEffect(() => {
    setHints([]);
    setHintLevel(0);
    setIsHintExhausted(false);
    setHintError(null);
  }, [submissionId]);

  const fetchHint = useCallback(async () => {
    if (isHintExhausted || !submissionId) {
      return;
    }

    setIsLoadingHint(true);
    setHintError(null);

    try {
      const response = await submissionsApi.getHint(submissionId);
      const data = response.data;

      if (data.items.length > 0) {
        setHints((prev) => [...prev, data]);
      }
      setHintLevel(data.level);
      setIsHintExhausted(data.level >= 3);
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "response" in error
          ? (error as { response: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      setHintError(msg ?? "Không lấy được gợi ý lúc này. Hãy thử lại sau.");
    } finally {
      setIsLoadingHint(false);
    }
  }, [submissionId, isHintExhausted]);

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
            solution{FILE_EXTENSIONS[language]}
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

      <div
        className="h-2 bg-border/50 hover:bg-primary/40 cursor-row-resize transition-all relative group select-none flex items-center justify-center"
        onMouseDown={onVerticalResize}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize console panel"
      >
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
          hints={hints}
          hintLevel={hintLevel}
          isHintExhausted={isHintExhausted}
          isLoadingHint={isLoadingHint}
          hintError={hintError}
          onFetchHint={fetchHint}
        />
      </div>
    </div>
  );
});
