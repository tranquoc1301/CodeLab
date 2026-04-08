import { useCallback, useRef, useState, useEffect } from 'react';
import api from '@/api';
import { API } from '@/config';
import { useAuth } from '@/store/auth';
import type { ProblemCursorResponse, ProblemSummary } from '@/types';

interface UseProblemCursorListOptions {
  search?: string;
  difficulty?: string;
  topics?: string[];
  sortBy?: string;
  initialLimit?: number;
}

interface UseProblemCursorListReturn {
  problems: ProblemSummary[];
  isLoading: boolean;
  isFetching: boolean;
  isLoadingMore: boolean;
  hasNext: boolean;
  error: Error | null;
  loadMore: () => void;
  refresh: () => void;
  isEmpty: boolean;
  totalCount: number | null;
}

export function useProblemCursorList(
  options: UseProblemCursorListOptions = {}
): UseProblemCursorListReturn {
  const {
    search,
    difficulty,
    topics,
    sortBy = 'newest',
    initialLimit = 20,
  } = options;

  // Get auth token for authenticated requests
  const { token } = useAuth();

  const abortControllerRef = useRef<AbortController | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedProblems, setAccumulatedProblems] = useState<ProblemSummary[]>([]);
  const [hasNext, setHasNext] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const buildQueryParams = useCallback((cursorParam: string | null) => {
    const params = new URLSearchParams();
    
    // Search parameter - server-side search
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    
    // Difficulty filter
    if (difficulty) params.append('difficulty', difficulty);
    
    // Topic filters
    if (topics && topics.length > 0) {
      topics.forEach(t => params.append('topics', t));
    }
    
    // Sort and pagination
    params.append('sort_by', sortBy);
    params.append('limit', String(initialLimit));
    if (cursorParam) params.append('cursor', cursorParam);
    
    return params.toString();
  }, [search, difficulty, topics, sortBy, initialLimit]);

  const fetchProblems = useCallback(async (cursorParam: string | null): Promise<ProblemCursorResponse> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const params = buildQueryParams(cursorParam);
    const response = await api.get<ProblemCursorResponse>(
      `${API.ENDPOINTS.PROBLEMS_PAGINATED}?${params}`,
      { signal: abortControllerRef.current.signal }
    );
    return response.data;
  }, [buildQueryParams]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setAccumulatedProblems([]);
    setCursor(null);
    setHasNext(true);
    setError(null);

    fetchProblems(null)
      .then((result) => {
        if (!cancelled) {
          setAccumulatedProblems(result.items);
          setCursor(result.next_cursor);
          setHasNext(result.has_next);
          setTotalCount(result.total_count);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [difficulty, topics, sortBy, initialLimit, search, fetchProblems]);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore || !hasNext) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const result = await fetchProblems(cursor);
      setAccumulatedProblems(prev => [...prev, ...result.items]);
      setCursor(result.next_cursor);
      setHasNext(result.has_next);
    } catch (err) {
      if ((err as Error).name !== 'CanceledError' && (err as Error).name !== 'AbortError') {
        setError(err as Error);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoadingMore, hasNext, fetchProblems]);

  const refresh = useCallback(() => {
    // Abort any in-flight requests to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setAccumulatedProblems([]);
    setCursor(null);
    setHasNext(true);
    setError(null);
    setIsLoading(true);

    const params = buildQueryParams(null);
    api.get<ProblemCursorResponse>(
      `${API.ENDPOINTS.PROBLEMS_PAGINATED}?${params}`,
      { signal: abortControllerRef.current.signal }
    )
      .then((response) => {
        setAccumulatedProblems(response.data.items);
        setCursor(response.data.next_cursor);
        setHasNext(response.data.has_next);
        setTotalCount(response.data.total_count);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(err);
          setIsLoading(false);
        }
      });
  }, [buildQueryParams]);

  const isEmpty = accumulatedProblems.length === 0 && !isLoading;

  return {
    problems: accumulatedProblems,
    isLoading,
    isFetching: isLoading || isLoadingMore,
    isLoadingMore,
    hasNext,
    error,
    loadMore,
    refresh,
    isEmpty,
    totalCount,
  };
}
