import { useState, useCallback, useRef, useEffect } from "react";
import { saveCode } from "@/shared/config/code";
import type { Language } from "@/shared/types";

type AutosaveStatus = "idle" | "saving" | "saved";

const AUTOSAVE_DELAY = 1000;
const CLEAR_STATUS_DELAY = 2000;

export function useAutosave(slug: string | undefined, language: Language, userId: number | undefined) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  const save = useCallback(
    (code: string) => {
      clearTimers();

      timerRef.current = setTimeout(() => {
        setStatus("saving");
        if (slug) {
          saveCode(slug, language, code, userId);
        }
        setStatus("saved");

        clearTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, CLEAR_STATUS_DELAY);
      }, AUTOSAVE_DELAY);
    },
    [slug, language, userId, clearTimers],
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return { status, save, clearTimers };
}
