import { useCallback, useState } from "react";
import type { Language, VerdictResult } from "@/types";
import api from "@/api";
import { API } from "@/config";
import { toast } from "sonner";

interface UseCodeExecutionReturn {
  verdict: VerdictResult | null;
  isRunning: boolean;
  isSubmitting: boolean;
  runCode: (code: string, language: Language, problemId: number | undefined) => Promise<void>;
  submitCode: (code: string, language: Language, problemId: number | undefined) => Promise<void>;
  resetVerdict: () => void;
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runCode = useCallback(
    async (code: string, language: Language, problemId: number | undefined) => {
      if (!problemId) return;
      setIsRunning(true);
      setVerdict(null);

      try {
        const res = await api.post(API.ENDPOINTS.SUBMISSIONS_EVALUATE, {
          source_code: code,
          language,
          problem_id: problemId,
          submission_type: "run",
        });
        setVerdict(res.data as VerdictResult);
      } catch {
        // 401 handled by axios interceptor (logout + redirect).
        // For other errors, the interceptor rejects the promise but we
        // still need to give the user visible feedback.
        toast.error("Code execution failed. Please try again.");
      } finally {
        setIsRunning(false);
      }
    },
    [],
  );

  const submitCode = useCallback(
    async (code: string, language: Language, problemId: number | undefined) => {
      if (!problemId) return;
      setIsSubmitting(true);
      setVerdict(null);

      try {
        const res = await api.post(API.ENDPOINTS.SUBMISSIONS_EVALUATE, {
          source_code: code,
          language,
          problem_id: problemId,
          submission_type: "submit",
        });
        setVerdict(res.data as VerdictResult);
      } catch {
        toast.error("Submission failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const resetVerdict = useCallback(() => {
    setVerdict(null);
  }, []);

  return { verdict, isRunning, isSubmitting, runCode, submitCode, resetVerdict };
}
