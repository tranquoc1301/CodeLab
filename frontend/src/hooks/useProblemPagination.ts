import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { API } from '@/config';
import type { ProblemCursorResponse } from '@/types';

interface UseProblemPaginationOptions {
  difficulty?: string;
  topic?: string;
  sortBy?: string;
  initialLimit?: number;
}

interface UseProblemPaginationReturn {
  problems: ProblemCursorResponse['items'];
  isLoading: boolean;
  isFetching: boolean;
  isLoadingMore: boolean;
  hasNext: boolean;
  error: Error | null;
  loadMore: () => void;
  refresh: () => void;
  isEmpty: boolean;
}

export function useProblemPagination(
  options: UseProblemPaginationOptions = {}
): UseProblemPaginationReturn {
  const {
    difficulty = '',
    topic = '',
    sortBy = 'newest',
    initialLimit = 20,
  } = options;

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedProblems, setAccumulatedProblems] = useState<ProblemCursorResponse['items']>([]);
  const [hasNext, setHasNext] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const buildQueryParams = useCallback((cursorParam: string | null) => {
    const params = new URLSearchParams();
    if (difficulty && difficulty !== 'all') params.append('difficulty', difficulty);
    if (topic) params.append('topic', topic);
    params.append('sort_by', sortBy);
    params.append('limit', String(initialLimit));
    if (cursorParam) params.append('cursor', cursorParam);
    return params.toString();
  }, [difficulty, topic, sortBy, initialLimit]);

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

  const queryKey = ['problems-paginated', difficulty, topic, sortBy, initialLimit];

  const { data, isLoading, isFetching } = useQuery<ProblemCursorResponse, Error>({
    queryKey: [...queryKey, 'initial'],
    queryFn: async () => {
      setAccumulatedProblems([]);
      setCursor(null);
      setHasNext(true);
      setError(null);
      return fetchProblems(null);
    },
    staleTime: 30000,
  });

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
    queryClient.invalidateQueries({ queryKey });
    setAccumulatedProblems([]);
    setCursor(null);
    setHasNext(true);
    setError(null);
  }, [queryClient, queryKey]);

  const allProblems = data ? [...(cursor ? accumulatedProblems : []), ...data.items] : [];
  const isEmpty = allProblems.length === 0 && !isLoading;

  return {
    problems: allProblems,
    isLoading: isLoading && !cursor,
    isFetching,
    isLoadingMore,
    hasNext: cursor ? hasNext : (data?.has_next ?? false),
    error,
    loadMore,
    refresh,
    isEmpty,
  };
}