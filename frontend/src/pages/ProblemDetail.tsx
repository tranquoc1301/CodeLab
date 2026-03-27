import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import CodeEditor from '../components/CodeEditor';
import api from '../api';
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
} from '../components/ui';
import { cn } from '../lib/utils';
import { API, COPY, DEFAULTS, DIFFICULTY_VARIANT, DIFFICULTY_COLOR } from '../config';
import type { Language } from '../types/language';

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  skill_tags: string[];
  sample_input: string | null;
  sample_output: string | null;
}

interface SubmissionResult {
  status: string | null;
  stdout: string | null;
  stderr: string | null;
  error_type: string | null;
}

function LoadingState() {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="space-y-4 w-full max-w-lg">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const [language, setLanguage] = useState<Language>(DEFAULTS.LANGUAGE);
  const [code, setCode] = useState<string>(COPY.CODE_TEMPLATES[DEFAULTS.LANGUAGE]);
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const { data: problem, isLoading } = useQuery<Problem>({
    queryKey: ['problem', id],
    queryFn: async () => {
      const res = await api.get(API.ENDPOINTS.PROBLEM_DETAIL(id!));
      return res.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.SUBMISSIONS, {
        source_code: code,
        language,
        stdin: stdin || undefined,
        problem_id: Number(id),
      });
      return res.data as SubmissionResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(COPY.CODE_TEMPLATES[lang]);
  };

  if (isLoading) return <LoadingState />;

  if (!problem) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-muted-foreground text-lg">{COPY.PROBLEM.NOT_FOUND}</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem description panel */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">{problem.title}</h1>
          <Badge
            variant={DIFFICULTY_VARIANT[problem.difficulty] ?? 'secondary'}
            className={cn(
              'bg-opacity-15 border-transparent mb-4',
              DIFFICULTY_COLOR[problem.difficulty],
            )}
          >
            {problem.difficulty}
          </Badge>

          <Card className="mb-4">
            <CardContent className="p-5">
              <p className="whitespace-pre-wrap leading-relaxed">{problem.description}</p>
            </CardContent>
          </Card>

          {problem.sample_input && (
            <div className="mb-3">
              <h3 className="font-semibold text-sm mb-1 text-muted-foreground">
                {COPY.PROBLEM.SAMPLE_INPUT}
              </h3>
              <pre className="bg-muted p-3 rounded-lg text-sm font-mono border">
                {problem.sample_input}
              </pre>
            </div>
          )}
          {problem.sample_output && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-1 text-muted-foreground">
                {COPY.PROBLEM.SAMPLE_OUTPUT}
              </h3>
              <pre className="bg-muted p-3 rounded-lg text-sm font-mono border">
                {problem.sample_output}
              </pre>
            </div>
          )}
        </div>

        {/* Code editor panel */}
        <div>
          <div className="flex items-center gap-2 mb-4" role="radiogroup" aria-label="Programming language">
            {(Object.keys(COPY.LANGUAGE_LABELS) as Language[]).map((lang) => (
              <Button
                key={lang}
                variant={language === lang ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange(lang)}
                role="radio"
                aria-checked={language === lang}
              >
                {COPY.LANGUAGE_LABELS[lang]}
              </Button>
            ))}
          </div>

          <CodeEditor language={language} value={code} onChange={(v) => setCode(v || '')} />

          <div className="mt-4">
            <Label htmlFor="stdin">{COPY.FORM_LABELS.STDIN}</Label>
            <Textarea
              id="stdin"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder={COPY.PROBLEM.STDIN_PLACEHOLDER}
              className="mt-1.5 h-20 font-mono"
            />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            variant="success"
            className="mt-4 gap-2"
          >
            {submitMutation.isPending && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitMutation.isPending ? COPY.PROBLEM.SUBMITTING : COPY.PROBLEM.SUBMIT}
          </Button>

          {result && (
            <Alert
              variant={result.status === 'Accepted' ? 'success' : 'destructive'}
              className="mt-4"
            >
              <AlertTitle>{result.status || COPY.PROBLEM.UNKNOWN_STATUS}</AlertTitle>
              <AlertDescription>
                {result.stdout && (
                  <div className="mt-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {COPY.PROBLEM.STDOUT}
                    </span>
                    <pre className="bg-background/50 p-2 rounded mt-1 text-sm font-mono border">
                      {result.stdout}
                    </pre>
                  </div>
                )}
                {result.stderr && (
                  <div className="mt-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {COPY.PROBLEM.STDERR}
                    </span>
                    <pre className="bg-background/50 p-2 rounded mt-1 text-sm font-mono border">
                      {result.stderr}
                    </pre>
                  </div>
                )}
                {result.error_type && (
                  <p className="font-medium mt-2">
                    {COPY.PROBLEM.ERROR_PREFIX} {result.error_type}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
