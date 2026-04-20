import { memo } from "react";
import { FileCode, Minimize2 } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { ConsolePanel } from "@/components/pages/problem-detail/ConsolePanel";
import { COPY } from "@/config";
import type { Language, VerdictResult } from "@/types";

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
}: ProblemEditorPanelProps) {
  const FILE_EXTENSION: Record<Language, string> = {
    python3: ".py",
    java: ".java",
    cpp: ".cpp",
    c: ".c",
  };

  return (
    <div className="flex flex-col min-h-0" style={{ width: editorMaximized ? "100%" : undefined }}>
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
              <Minimize2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex flex-col min-h-0"
        style={{ height: `${100 - consoleHeight}%` }}
      >
        <CodeEditor language={language} value={code} onChange={onCodeChange} />
      </div>

      <div
        className="h-1 bg-border hover:bg-primary/50 cursor-row-resize transition-colors shrink-0"
        onMouseDown={onVerticalResize}
        role="separator"
        aria-orientation="horizontal"
      />

      <div
        className="flex flex-col min-h-0"
        style={{ height: `${consoleHeight}%` }}
      >
        <ConsolePanel
          verdict={verdict}
          isRunning={isRunning || isSubmitting}
          totalTestCases={verdict?.total_test_cases ?? 0}
        />
      </div>
    </div>
  );
});