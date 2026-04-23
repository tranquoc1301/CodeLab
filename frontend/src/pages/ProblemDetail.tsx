import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/store/auth";
import { setStoredIntent } from "@/store/authGuard";
import { useProblemNavigation } from "@/hooks/useProblemNavigation";
import { useCodeExecution } from "@/hooks/useCodeExecution";
import { useSplitResize } from "@/hooks/useSplitResize";
import { useProblemCode } from "@/hooks/useProblemCode";
import { useAutosave } from "@/hooks/useAutosave";
import { useLoginGate } from "@/hooks/useLoginGate";
import { useNumericSlugRedirect } from "@/hooks/useNumericSlugRedirect";
import api from "@/api";
import { API, COPY, DEFAULTS, ROUTES } from "@/config";
import { getCodeTemplate } from "@/config/code";
import type { Problem } from "@/types";
// Language: used via useProblemCode (language), ProblemToolbar (language), ProblemEditorPanel (language)

// Extracted sub-components
import { LoadingState } from "@/components/pages/problem-detail/LoadingState";
import { LoginGate } from "@/components/pages/problem-detail/LoginGate";
import { LoginPromptOverlay } from "@/components/pages/problem-detail/LoginPromptOverlay";
import { ProblemDescription } from "@/components/pages/problem-detail/ProblemDescription";
import { ProblemToolbar } from "@/components/pages/problem-detail/ProblemToolbar";
import { ProblemEditorPanel } from "@/components/pages/problem-detail/ProblemEditorPanel";

// Main component
export default function ProblemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Hooks
  const { showLoginPrompt, setShowLoginPrompt } = useLoginGate(isAuthenticated);
  useNumericSlugRedirect(slug);

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
    staleTime: 1000 * 60 * 5, // 5 minutes - problem data rarely changes
  });

  const { status: autosaveStatus, save: autosave } = useAutosave(
    slug,
    DEFAULTS.LANGUAGE,
  );

  const { language, code, setCode, handleLanguageChange, handleCodeChange } =
    useProblemCode(problem, slug, autosave);

  const {
    verdict,
    isRunning,
    isSubmitting,
    runCode,
    submitCode,
    resetVerdict,
  } = useCodeExecution();

  // Reset verdict when problem changes
  const previousProblemIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (problem?.id && problem.id !== previousProblemIdRef.current) {
      previousProblemIdRef.current = problem.id;
      resetVerdict();
    }
  }, [problem?.id, resetVerdict]);

  const {
    splitRef,
    editorPanelRef,
    splitPercent,
    consoleHeight,
    handleHorizontalMouseDown,
    handleVerticalMouseDown,
  } = useSplitResize();

  // Panel states
  const [descriptionExpanded, setDescriptionExpanded] = useState(true);
  const [editorMaximized, setEditorMaximized] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Compute split width directly (avoid CSS custom property for smooth resize)
  const leftPanelWidth = descriptionExpanded
    ? `calc(${splitPercent}% - 1px)`  // -1px accounts for border
    : `calc(${splitPercent}%)`;

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
      <div 
        className="h-[calc(100dvh-4rem)] -mx-4 flex flex-col overflow-hidden" 
        ref={splitRef}
        style={{ 
          "--split-percent": `${splitPercent}%`, 
          "--console-height": `${consoleHeight}%` 
        } as React.CSSProperties}
      >
        {/* Top toolbar */}
        <ProblemToolbar
          problem={{
            id: problem.id,
            title: problem.title,
            slug: problem.slug,
          }}
          frontendId={problem.frontend_id}
          language={language}
          autosaveStatus={autosaveStatus}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          showResetConfirm={showResetConfirm}
          prevProblem={prevProblem}
          nextProblem={nextProblem}
          onLanguageChange={(lang) => handleLanguageChange(lang)}
          onNavigatePrev={navigatePrev}
          onNavigateNext={navigateNext}
          onResetCode={handleResetCode}
          onCancelReset={() => setShowResetConfirm(false)}
          onRunCode={handleRunCode}
          onSubmit={handleSubmit}
          onShowResetConfirm={() => setShowResetConfirm(true)}
          onNavigateHome={() => navigate(ROUTES.HOME)}
        />

        {/* Main content with resizable split */}
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
                ? { width: leftPanelWidth }
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

{/* Horizontal resize handle */}
      {!editorMaximized && (
        <div
          className="w-1.5 bg-border/50 hover:bg-primary/40 cursor-col-resize transition-all relative group select-none"
          onMouseDown={handleHorizontalMouseDown}
          role="separator"
          aria-orientation="vertical"
        >
          {/* Drag indicator dots */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/60" />
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/60" />
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      )}

          {/* Right: Editor + Console with vertical resize */}
          {isAuthenticated ? (
             <div
               className="flex flex-col min-h-0"
               style={{
                 width: editorMaximized
                   ? "100%"
                   : descriptionExpanded
                     ? `calc(100% - ${splitPercent}% - 1px)`
                     : `calc(100% - 3rem)`,
               }}
             >
              <ProblemEditorPanel
                language={language}
                languageLabel={languageLabel}
                code={code}
                onCodeChange={wrappedCodeChange}
                verdict={verdict}
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                editorMaximized={editorMaximized}
                consoleHeight={consoleHeight}
                onRestoreLayout={() => setEditorMaximized(false)}
                onVerticalResize={handleVerticalMouseDown}
                editorPanelRef={editorPanelRef}
              />
            </div>
          ) : (
             <div
               className="flex items-center justify-center"
               style={{
                 width: editorMaximized
                   ? "100%"
                   : descriptionExpanded
                     ? `calc(100% - ${splitPercent}% - 1px)`
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
