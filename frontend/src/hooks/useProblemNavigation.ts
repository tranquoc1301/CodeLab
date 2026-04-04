import { useEffect, useState, useCallback } from 'react';
import api from '@/api';
import { API } from '@/config';

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

    api
      .get(API.ENDPOINTS.PROBLEM_NAVIGATION(currentSlug))
      .then((res) => {
        setPrevProblem(res.data.prev);
        setNextProblem(res.data.next);
      })
      .catch(() => {
        setPrevProblem(null);
        setNextProblem(null);
      });
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
