import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Play,
  Terminal,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Lock,
  Tag,
  FileText,
  Code,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Save,
  LogIn,
  AlertCircle,
} from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { useAuth } from "@/store/auth";
import { getStoredPath, setStoredIntent } from "@/store/authGuard";
import api from "@/api";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Label,
  Textarea,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ConstraintText,
} from "@/components/ui";
import { API, COPY, DEFAULTS, ROUTES } from "@/config";
import { resolveCode, saveCode } from "@/config/code";
import type { Language, Problem, SubmissionResult } from "@/types";

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <Card className="p-8 text-center">
      <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{COPY.LOGIN.GATED_TITLE}</h3>
      <p className="text-muted-foreground mb-4">
        {COPY.LOGIN.GATED_DESCRIPTION}
      </p>
      <Button onClick={onLogin}>{COPY.NAV.LOGIN}</Button>
    </Card>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: typeof Terminal;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function ProblemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [language, setLanguage] = useState<Language>(DEFAULTS.LANGUAGE);
  const [code, setCode] = useState<string>("");
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState("description");
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");

  useEffect(() => {
    const storedPath = getStoredPath();
    if (!isAuthenticated && storedPath && storedPath.startsWith("/problems/")) {
      setShowLoginPrompt(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (slug && !slug.includes("-") && !isNaN(Number(slug))) {
      api
        .get(`/problems/redirect/${slug}`)
        .then((res) => {
          navigate(`/problems/${res.data.slug}`, { replace: true });
        })
        .catch(() => {
          navigate("/", { replace: true });
        });
    }
  }, [slug, navigate]);

  const handleLoginFromPrompt = useCallback(() => {
    if (slug) {
      setStoredIntent(`/problems/${slug}`);
    }
    navigate(ROUTES.LOGIN);
    setShowLoginPrompt(false);
  }, [slug, navigate]);

  const handleDismissPrompt = useCallback(() => {
    setShowLoginPrompt(false);
  }, []);

  const { data: problem, isLoading } = useQuery<Problem>({
    queryKey: ["problem", slug],
    queryFn: async () => {
      const res = await api.get(API.ENDPOINTS.PROBLEM_BY_SLUG(slug!));
      return res.data;
    },
  });

  useEffect(() => {
    if (problem) {
      setCode(resolveCode(problem, slug, language));
    }
  }, [problem, language, slug]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.SUBMISSIONS, {
        source_code: code,
        language,
        stdin: stdin || undefined,
        problem_id: problem?.id,
      });
      return res.data as SubmissionResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(resolveCode(problem, slug, lang));
  };

  const handleLogin = () => {
    setShowLoginPrompt(true);
  };

  if (isLoading) return <LoadingState />;

  if (!problem) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-muted-foreground text-lg">
          {COPY.PROBLEM.NOT_FOUND}
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="description">
            <FileText className="h-4 w-4 mr-2" />
            {COPY.PROBLEM.DESCRIPTION}
          </TabsTrigger>
          <TabsTrigger value="submit">
            <Code className="h-4 w-4 mr-2" />
            {COPY.PROBLEM.SUBMIT_CODE}
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {COPY.PROBLEM.RESULT}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold tracking-tight">
                {problem.title}
              </h1>
              <DifficultyBadge difficulty={problem.difficulty} />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {problem.topics?.map((topic) => (
                <Badge key={topic.id} variant="outline">
                  <Tag className="h-3 w-3 mr-1" />
                  {topic.name}
                </Badge>
              ))}
            </div>
          </div>
          <Card>
            <CardContent className="p-5">
              <p className="whitespace-pre-wrap leading-relaxed prose">
                {problem.description}
              </p>
            </CardContent>
          </Card>
          {problem.examples && problem.examples.length > 0 && (
            <CollapsibleSection
              title={COPY.PROBLEM.EXAMPLES}
              icon={Terminal}
              defaultOpen
            >
              <div className="space-y-4">
                {problem.examples.map((ex) => (
                  <div key={ex.id}>
                    <p className="font-medium mb-2">Example {ex.example_num}</p>
                    {ex.images && ex.images.length > 0 && (
                      <img
                        src={ex.images[0]}
                        alt={`Example ${ex.example_num}`}
                        className="w-1/2 mb-2 rounded-lg"
                      />
                    )}
                    <pre className="bg-muted p-3 rounded-lg text-sm font-mono whitespace-pre-wrap">
                      {ex.example_text}
                    </pre>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
          {problem.constraints && problem.constraints.length > 0 && (
            <CollapsibleSection
              title={COPY.PROBLEM.CONSTRAINTS}
              icon={AlertTriangle}
              defaultOpen={true}
            >
              <ul className="space-y-1.5 mt-1">
                {problem.constraints.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 rounded-full bg-muted-foreground shrink-0" />
                    <ConstraintText text={c.constraint_text} />
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}
          {problem.hints && problem.hints.length > 0 && (
            <CollapsibleSection title={COPY.PROBLEM.HINTS} icon={Lightbulb}>
              <div className="space-y-2">
                {problem.hints.map((hint) => (
                  <div key={hint.id}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowHints((prev) => ({
                          ...prev,
                          [hint.id]: !prev[hint.id],
                        }))
                      }
                      className="justify-start"
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Hint {hint.hint_num}
                    </Button>
                    {showHints[hint.id] && (
                      <div
                        className="mt-2 p-3 bg-muted rounded-lg text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: hint.hint_text }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </TabsContent>

        <TabsContent value="submit">
          {!isAuthenticated ? (
            <LoginGate onLogin={handleLogin} />
          ) : (
            <div className="space-y-4">
              <div
                className="flex items-center gap-2"
                role="radiogroup"
                aria-label="Programming language"
              >
                {(Object.keys(COPY.LANGUAGE_LABELS) as Language[]).map(
                  (lang) => (
                    <Button
                      key={lang}
                      variant={language === lang ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLanguageChange(lang)}
                      role="radio"
                      aria-checked={language === lang}
                    >
                      {COPY.LANGUAGE_LABELS[lang]}
                    </Button>
                  ),
                )}
              </div>

              <CodeEditor
                language={language}
                value={code}
                onChange={(v) => {
                  setCode(v || "");
                  setAutosaveStatus("saving");
                  setTimeout(() => {
                    saveCode(slug, language, v || "");
                    setAutosaveStatus("saved");
                    setTimeout(() => setAutosaveStatus("idle"), 2000);
                  }, 1000);
                }}
              />

              <div>
                <Label htmlFor="stdin">{COPY.FORM_LABELS.STDIN}</Label>
                <Textarea
                  id="stdin"
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder={COPY.PROBLEM.STDIN_PLACEHOLDER}
                  className="mt-1.5 h-20 font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {autosaveStatus === "saving" && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {COPY.PROBLEM.SAVING}
                    </>
                  )}
                  {autosaveStatus === "saved" && (
                    <>
                      <Save className="h-3 w-3" />
                      {COPY.PROBLEM.AUTOSAVED}
                    </>
                  )}
                </div>
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  variant="success"
                  className="gap-2"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {submitMutation.isPending
                    ? COPY.PROBLEM.SUBMITTING
                    : COPY.PROBLEM.SUBMIT}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="results">
          {result && (
            <Alert
              variant={result.status === "Accepted" ? "success" : "destructive"}
            >
              {result.status === "Accepted" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {result.status || COPY.PROBLEM.UNKNOWN_STATUS}
              </AlertTitle>
              {(result.execution_time_ms || result.memory_used_kb) && (
                <p className="text-sm mt-1">
                  {result.execution_time_ms}ms •{" "}
                  {result.memory_used_kb &&
                    (result.memory_used_kb / 1024).toFixed(1)}
                  MB
                </p>
              )}
              <AlertDescription className="mt-3 space-y-3">
                {result.stdout && (
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {COPY.PROBLEM.STDOUT}
                    </span>
                    <pre className="bg-background/50 p-2 rounded mt-1 text-sm font-mono border whitespace-pre-wrap">
                      {result.stdout}
                    </pre>
                  </div>
                )}
                {result.stderr && (
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {COPY.PROBLEM.STDERR}
                    </span>
                    <pre className="bg-background/50 p-2 rounded mt-1 text-sm font-mono border whitespace-pre-wrap">
                      {result.stderr}
                    </pre>
                  </div>
                )}
                {result.error_type && (
                  <p className="font-medium">
                    {COPY.PROBLEM.ERROR_PREFIX} {result.error_type}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
          {!result && (
            <p className="text-muted-foreground text-center py-8">
              No submission yet. Go to Submit tab to solve this problem.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleDismissPrompt}
          />
          <div className="relative z-10 max-w-md mx-4 bg-card border border-warning rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{COPY.LOGIN.GATED_TITLE}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {COPY.LOGIN.GATED_DESCRIPTION}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={handleLoginFromPrompt}>
                    <LogIn className="h-4 w-4 mr-2" />
                    {COPY.NAV.LOGIN}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissPrompt}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
