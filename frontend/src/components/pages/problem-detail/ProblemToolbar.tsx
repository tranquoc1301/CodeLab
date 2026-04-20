import { memo } from "react";
import {
  Play,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookmarkButton } from "@/components/pages/problem-detail/BookmarkButton";
import { COPY } from "@/config";
import type { Language } from "@/types";

interface NavProblem {
  frontend_id: number;
  title: string;
  slug: string;
}

interface ProblemToolbarProps {
  problem: { id: number; title: string; slug: string } | null;
  frontendId?: number;
  language: Language;
  autosaveStatus: "idle" | "saving" | "saved";
  isRunning: boolean;
  isSubmitting: boolean;
  showResetConfirm: boolean;
  prevProblem: NavProblem | null;
  nextProblem: NavProblem | null;
  onLanguageChange: (language: Language) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onResetCode: () => void;
  onCancelReset: () => void;
  onRunCode: () => void;
  onSubmit: () => void;
  onShowResetConfirm: () => void;
  onNavigateHome: () => void;
}

const FILE_EXTENSION: Record<Language, string> = {
  python3: ".py",
  java: ".java",
  cpp: ".cpp",
  c: ".c",
};

export const ProblemToolbar = memo(function ProblemToolbar({
  problem,
  frontendId,
  language,
  autosaveStatus,
  isRunning,
  isSubmitting,
  showResetConfirm,
  prevProblem,
  nextProblem,
  onLanguageChange,
  onNavigatePrev,
  onNavigateNext,
  onResetCode,
  onCancelReset,
  onRunCode,
  onSubmit,
  onShowResetConfirm,
  onNavigateHome,
}: ProblemToolbarProps) {
  return (
    <div className="relative flex items-center justify-between px-3 py-2 border-b border-border/80 bg-background/95 backdrop-blur-sm z-20">
      {/* Left section: Back + Problem info + Navigation */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNavigateHome}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Back to problems"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">
            Problem
          </h1>
          {frontendId && (
            <span className="shrink-0 text-base font-mono text-muted-foreground">
              #{frontendId}
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-0.5 ml-1 pl-2 border-l border-border/60">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNavigatePrev}
            disabled={!prevProblem}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous problem"
            title={prevProblem ? prevProblem.title : "No previous problem"}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNavigateNext}
            disabled={!nextProblem}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next problem"
            title={nextProblem ? nextProblem.title : "No next problem"}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Right section: Language + Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative group">
          <Select
            value={language}
            onValueChange={(val) => onLanguageChange(val as Language)}
          >
            <SelectTrigger
              className="h-8 w-[110px] text-xs"
              aria-label="Programming language"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {Object.entries(COPY.LANGUAGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground bg-secondary/50 rounded-md border border-border">
          <FileCode className="h-3 w-3" aria-hidden />
          <span className="font-mono">solution{FILE_EXTENSION[language]}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-15 justify-end">
          {autosaveStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              <span className="hidden sm:inline">Saving...</span>
            </>
          )}
          {autosaveStatus === "saved" && (
            <>
              <CheckCircle className="h-3 w-3 text-success" aria-hidden />
              <span className="hidden sm:inline text-success">Saved</span>
            </>
          )}
        </div>

        <div className="hidden sm:block w-px h-6 bg-border" aria-hidden />

        {problem && (
          <BookmarkButton
            problemId={problem.id}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
          />
        )}

        <div className="relative">
          <Button
            onClick={onShowResetConfirm}
            disabled={isRunning || isSubmitting}
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label={COPY.PROBLEM.RESET_CODE}
            title={COPY.PROBLEM.RESET_CODE}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </Button>

          {showResetConfirm && (
            <div className="absolute top-full right-0 mt-2 z-50 bg-popover border border-border rounded-lg p-3 shadow-xl w-56 animate-scale-in">
              <p className="text-xs text-popover-foreground mb-3">
                {COPY.PROBLEM.RESET_CODE_CONFIRM}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onResetCode}
                  className="h-7 text-xs flex-1"
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelReset}
                  className="h-7 text-xs flex-1 text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={onRunCode}
          disabled={isRunning || isSubmitting}
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-border/80 transition-all"
          aria-label={isRunning ? COPY.PROBLEM.RUNNING : COPY.PROBLEM.RUN_CODE}
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {isRunning ? COPY.PROBLEM.RUNNING : COPY.PROBLEM.RUN_CODE}
          </span>
        </Button>

        <Button
          onClick={onSubmit}
          disabled={isSubmitting || isRunning}
          variant="default"
          size="sm"
          className="h-8 text-xs gap-1.5 bg-success hover:bg-success/90 active:bg-success text-success-foreground shadow-sm shadow-success/30 hover:shadow-success/40 transition-all font-medium"
          aria-label={isSubmitting ? COPY.PROBLEM.SUBMITTING : COPY.PROBLEM.SUBMIT}
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>{isSubmitting ? COPY.PROBLEM.SUBMITTING : COPY.PROBLEM.SUBMIT}</span>
        </Button>
      </div>
    </div>
  );
});