import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  FileCode,
} from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/store/auth";
import { getStoredPath, setStoredIntent } from "@/store/authGuard";
import { useProblemNavigation } from "@/hooks/useProblemNavigation";
import { useCodeExecution } from "@/hooks/useCodeExecution";
import { useSplitResize } from "@/hooks/useSplitResize";
import { useProblemCode } from "@/hooks/useProblemCode";
import { useAutosave } from "@/hooks/useAutosave";
import api from "@/api";
import { Button } from "@/components/ui";
import { API, COPY, DEFAULTS, ROUTES } from "@/config";
import { getCodeTemplate } from "@/config/code";
import type { Language, Problem } from "@/types";

const FILE_EXTENSION: Record<Language, string> = {
  python3: ".py",
  java: ".java",
  cpp: ".cpp",
  c: ".c",
};

// Extracted sub-components
import { LoadingState } from "@/components/pages/problem-detail/LoadingState";
import { LoginGate } from "@/components/pages/problem-detail/LoginGate";
import { LoginPromptOverlay } from "@/components/pages/problem-detail/LoginPromptOverlay";
import { ProblemDescription } from "@/components/pages/problem-detail/ProblemDescription";
import { ConsolePanel } from "@/components/pages/problem-detail/ConsolePanel";

// ---------------------------------------------------------------------------
// Login gate effect
// ---------------------------------------------------------------------------

function useLoginGate(isAuthenticated: boolean) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(() => {
    const intentPath = getStoredPath();
    return (
      !isAuthenticated && !!intentPath && intentPath.startsWith("/problems/")
    );
  });

  return { showLoginPrompt, setShowLoginPrompt };
}

// ---------------------------------------------------------------------------
// Numeric slug redirect
// ---------------------------------------------------------------------------

function useNumericSlugRedirect(
  slug: string | undefined,
  navigate: ReturnType<typeof useNavigate>,
) {
  useEffect(() => {
    if (!slug || slug.includes("-") || isNaN(Number(slug))) return;
    api
      .get(`/problems/redirect/${slug}`)
      .then((res) => {
        navigate(`/problems/${res.data.slug}`, { replace: true });
      })
      .catch(() => navigate("/", { replace: true }));
  }, [slug, navigate]);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProblemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Hooks
  const { showLoginPrompt, setShowLoginPrompt } = useLoginGate(isAuthenticated);
  useNumericSlugRedirect(slug, navigate);

  const { prevProblem, nextProblem, navigatePrev, navigateNext } =
    useProblemNavigation(slug, (nextSlug) => {
      navigate(ROUTES.problemDetail(nextSlug));
    });

  const { data: problem, isLoading } = useQuery<Problem>({
    queryKey: ["problem", slug],
    queryFn: async () => {
      const res = await api.get(API.ENDPOINTS.PROBLEM_BY_SLUG(slug!));
      return res.data;
    },
    enabled: !!slug,
  });

  const { status: autosaveStatus, save: autosave } = useAutosave(
    slug,
    DEFAULTS.LANGUAGE,
  );

  const { language, code, setCode, handleLanguageChange, handleCodeChange } =
    useProblemCode(problem, slug, autosave);

  const { verdict, isRunning, isSubmitting, runCode, submitCode } =
    useCodeExecution();

  const {
    splitRef,
    editorSplitRef,
    splitPercent,
    consoleHeight,
    handleHorizontalMouseDown,
    handleVerticalMouseDown,
  } = useSplitResize();

  // Panel states
  const [descriptionExpanded, setDescriptionExpanded] = useState(true);
  const [editorMaximized, setEditorMaximized] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Track unsaved changes
  const originalCodeRef = useRef<string>("");

  const wrappedCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value ?? "";
      handleCodeChange(newCode);
    },
    [handleCodeChange],
  );

  // Reset code handler — resets to the problem's default snippet from DB
  const handleResetCode = useCallback(() => {
    if (problem) {
      // Try to get the problem's default code snippet for this language from DB
      const dbSnippet = problem.code_snippets?.find(
        (cs) => cs.language === language,
      );
      const defaultCode = dbSnippet?.code ?? getCodeTemplate(language);
      setCode(defaultCode);
      originalCodeRef.current = defaultCode;
      setShowResetConfirm(false);
    }
  }, [problem, language, setCode]);

  // Run / Submit handlers
  const handleRunCode = useCallback(() => {
    runCode(code, language, problem?.id);
  }, [runCode, code, language, problem?.id]);

  const handleSubmit = useCallback(() => {
    submitCode(code, language, problem?.id);
  }, [submitCode, code, language, problem?.id]);

  const handleLoginFromPrompt = useCallback(() => {
    if (slug) setStoredIntent(`/problems/${slug}`);
    navigate(ROUTES.LOGIN);
    setShowLoginPrompt(false);
  }, [slug, navigate, setShowLoginPrompt]);

  const handleDismissPrompt = useCallback(() => {
    setShowLoginPrompt(false);
  }, [setShowLoginPrompt]);

  // Early returns
  if (isLoading) return <LoadingState />;

  if (!problem) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-background">
        <p className="text-zinc-500 text-lg">{COPY.PROBLEM.NOT_FOUND}</p>
      </div>
    );
  }

  const languageLabel = COPY.LANGUAGE_LABELS[language] ?? language;

  return (
    <ErrorBoundary>
      <div className="h-[calc(100dvh-4rem)] -mx-4 flex flex-col" ref={splitRef}>
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-3 py-2 border-b border-border/80 bg-background/95 backdrop-blur-sm z-20">
          {/* Left section: Back + Problem info + Navigation */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(ROUTES.HOME)}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Back to problems"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>

            <div className="flex items-center gap-2 min-w-0">
              {problem.frontend_id && (
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  #{problem.frontend_id}
                </span>
              )}
              <span className="text-sm font-semibold text-foreground truncate max-w-45 sm:max-w-xs">
                {problem.title}
              </span>
              <DifficultyBadge difficulty={problem.difficulty} />
            </div>

            {/* Prev/Next */}
            <div className="hidden sm:flex items-center gap-0.5 ml-1 pl-2 border-l border-border/60">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={navigatePrev}
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
                onClick={navigateNext}
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
            {/* Language selector — more prominent */}
            <div className="relative group">
              <select
                value={language}
                onChange={(e) =>
                  handleLanguageChange(e.target.value as Language)
                }
                className="h-8 pl-3 pr-8 text-xs font-medium rounded-lg bg-secondary border border-border text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 appearance-none cursor-pointer hover:bg-accent transition-all"
                aria-label="Programming language"
              >
                {Object.entries(COPY.LANGUAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none"
                aria-hidden
              />
            </div>

            {/* File indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground bg-secondary/50 rounded-md border border-border">
              <FileCode className="h-3 w-3" aria-hidden />
              <span className="font-mono">
                solution{FILE_EXTENSION[language]}
              </span>
            </div>

            {/* Autosave status */}
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

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border" aria-hidden />

            {/* Reset code button */}
            <div className="relative">
              <Button
                onClick={() => setShowResetConfirm(true)}
                disabled={isRunning || isSubmitting}
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label={COPY.PROBLEM.RESET_CODE}
                title={COPY.PROBLEM.RESET_CODE}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              </Button>

              {/* Reset confirmation popover */}
              {showResetConfirm && (
                <div className="absolute top-full right-0 mt-2 z-50 bg-popover border border-border rounded-lg p-3 shadow-xl w-56 animate-scale-in">
                  <p className="text-xs text-popover-foreground mb-3">
                    {COPY.PROBLEM.RESET_CODE_CONFIRM}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleResetCode}
                      className="h-7 text-xs flex-1"
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowResetConfirm(false)}
                      className="h-7 text-xs flex-1 text-muted-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Run Code button */}
            <Button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-border/80 transition-all"
              aria-label={isRunning ? "Running..." : COPY.PROBLEM.RUN_CODE}
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="hidden sm:inline">
                {isRunning ? "Running..." : COPY.PROBLEM.RUN_CODE}
              </span>
            </Button>

            {/* Submit button — more prominent */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isRunning}
              variant="default"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-success hover:bg-success/90 active:bg-success text-success-foreground shadow-sm shadow-success/30 hover:shadow-success/40 transition-all font-medium"
              aria-label={
                isSubmitting ? COPY.PROBLEM.SUBMITTING : COPY.PROBLEM.SUBMIT
              }
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" aria-hidden />
              )}
              <span>
                {isSubmitting ? COPY.PROBLEM.SUBMITTING : COPY.PROBLEM.SUBMIT}
              </span>
            </Button>
          </div>
        </div>

        {/* ── Main content with resizable split ───────────────────── */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Problem Description */}
          <div
            className={`overflow-y-auto scrollbar-dark border-r border-border/80 bg-card transition-all duration-300 ease-out ${
              editorMaximized
                ? "w-0 min-w-0 p-0 overflow-hidden border-r-0"
                : descriptionExpanded
                  ? ""
                  : "w-12 min-w-12"
            }`}
            style={
              !editorMaximized && descriptionExpanded
                ? { width: `${splitPercent}%` }
                : editorMaximized
                  ? { width: "0px" }
                  : undefined
            }
            aria-label="Problem description"
          >
            {descriptionExpanded && !editorMaximized && (
              <>
                {/* Description header */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <BookOpen
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      Description
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditorMaximized(true)}
                      className="p-1.5 hover:bg-accent rounded-md transition-colors"
                      aria-label={COPY.PROBLEM.MAXIMIZE_EDITOR}
                      title={COPY.PROBLEM.MAXIMIZE_EDITOR}
                    >
                      <Maximize2
                        className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded(false)}
                      className="p-1.5 hover:bg-accent rounded-md transition-colors"
                      aria-label={COPY.PROBLEM.COLLAPSE_DESC}
                      title={COPY.PROBLEM.COLLAPSE_DESC}
                    >
                      <PanelLeftClose
                        className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                        aria-hidden
                      />
                    </button>
                  </div>
                </div>
                <ProblemDescription problem={problem} />
              </>
            )}

            {/* Collapsed tab */}
            {!descriptionExpanded && !editorMaximized && (
              <div className="flex flex-col items-center h-full">
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(true)}
                  className="mt-3 p-2 hover:bg-accent rounded-md transition-colors"
                  aria-label={COPY.PROBLEM.EXPAND_DESC}
                  title={COPY.PROBLEM.EXPAND_DESC}
                >
                  <PanelLeftOpen
                    className="h-4 w-4 text-muted-foreground hover:text-foreground"
                    aria-hidden
                  />
                </button>
                <span
                  className="text-[10px] text-muted-foreground/60 mt-2"
                  style={{ writingMode: "vertical-rl" }}
                >
                  Description
                </span>
              </div>
            )}
          </div>

          {/* Resize handle (horizontal) */}
          {!editorMaximized && (
            <div
              className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors shrink-0"
              onMouseDown={handleHorizontalMouseDown}
              role="separator"
              aria-orientation="vertical"
            />
          )}

          {/* Right: Editor + Console with vertical resize */}
          {isAuthenticated ? (
            <div
              ref={editorSplitRef}
              className="flex flex-col min-h-0"
              style={{
                width: editorMaximized
                  ? "100%"
                  : descriptionExpanded
                    ? `${100 - splitPercent}%`
                    : `calc(100% - 3rem)`,
              }}
            >
              {/* Editor panel header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-card/80 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <FileCode
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden
                  />
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
                      onClick={() => setEditorMaximized(false)}
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

              {/* Code Editor */}
              <div
                className="flex flex-col min-h-0"
                style={{ height: `${100 - consoleHeight}%` }}
              >
                <CodeEditor
                  language={language}
                  value={code}
                  onChange={wrappedCodeChange}
                />
              </div>

              {/* Resize handle (vertical) */}
              <div
                className="h-1 bg-border hover:bg-primary/50 cursor-row-resize transition-colors shrink-0"
                onMouseDown={handleVerticalMouseDown}
                role="separator"
                aria-orientation="horizontal"
              />

              {/* Console/Test Result panel */}
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
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                width: editorMaximized
                  ? "100%"
                  : descriptionExpanded
                    ? `${100 - splitPercent}%`
                    : `calc(100% - 3rem)`,
              }}
            >
              <LoginGate onLogin={() => setShowLoginPrompt(true)} />
            </div>
          )}
        </div>

        {/* Login prompt overlay */}
        {showLoginPrompt && (
          <LoginPromptOverlay
            onLogin={handleLoginFromPrompt}
            onDismiss={handleDismissPrompt}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
