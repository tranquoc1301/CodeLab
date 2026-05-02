import { useEffect, useState, useCallback } from 'react';
import api from '@/shared/api';
import { API } from '@/shared/config';

interface NavProblem {
  frontend_id: number;
  title: string;
  slug: string;
}

interface UseProblemNavigationReturn {
  prevProblem: NavProblem | null;
  nextProblem: NavProblem | null;
  navigatePrev: () => void;
  navigateNext: () => void;
}

export function useProblemNavigation(
  currentSlug: string | undefined,
  onNavigate: (slug: string) => void,
): UseProblemNavigationReturn {
  const [prevProblem, setPrevProblem] = useState<NavProblem | null>(null);
  const [nextProblem, setNextProblem] = useState<NavProblem | null>(null);

  useEffect(() => {
    if (!currentSlug) return;

    let cancelled = false;

    api
      .get(API.ENDPOINTS.PROBLEM_NAVIGATION(currentSlug))
      .then((res) => {
        if (!cancelled) {
          setPrevProblem(res.data.prev);
          setNextProblem(res.data.next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrevProblem(null);
          setNextProblem(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

  const navigatePrev = useCallback(() => {
    if (prevProblem) onNavigate(prevProblem.slug);
  }, [prevProblem, onNavigate]);

  const navigateNext = useCallback(() => {
    if (nextProblem) onNavigate(nextProblem.slug);
  }, [nextProblem, onNavigate]);

  return {
    prevProblem,
    nextProblem,
    navigatePrev,
    navigateNext,
  };
}
