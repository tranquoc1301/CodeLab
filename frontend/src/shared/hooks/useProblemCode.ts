import { useState, useEffect, useCallback } from "react";
import type { Language, Problem } from "@/shared/types";
import { resolveCode } from "@/shared/config/code";
import { DEFAULTS } from "@/shared/config/defaults";

interface UseProblemCodeReturn {
  language: Language;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  handleLanguageChange: (lang: Language) => void;
  handleCodeChange: (value: string | undefined) => void;
}

export function useProblemCode(
  problem: Problem | undefined,
  slug: string | undefined,
  autosave: (code: string) => void,
): UseProblemCodeReturn {
  const [language, setLanguage] = useState<Language>(DEFAULTS.LANGUAGE);
  const [code, setCode] = useState<string>("");

  // Sync code to problem/language changes — this is a legitimate use of
  // setState in effect because we're syncing external data (problem snippet)
  // to local editable state. The value can't be purely derived because the
  // user edits it between syncs.
  useEffect(() => {
    if (problem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(resolveCode(problem, slug, language));
    }
  }, [problem, language, slug]);

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      setCode(resolveCode(problem, slug, lang));
    },
    [problem, slug],
  );

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value ?? "";
      setCode(newCode);
      autosave(newCode);
    },
    [autosave],
  );

  return { language, code, setCode, handleLanguageChange, handleCodeChange };
}
