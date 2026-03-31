import { useState, useEffect } from 'react';
import api from '@/api';
import { API } from '@/config';
import type { Topic } from '@/types';

interface UseTopicsReturn {
  topics: Topic[];
  isLoading: boolean;
  error: Error | null;
}

export function useTopics(): UseTopicsReturn {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.get<Topic[]>(API.ENDPOINTS.TOPICS)
      .then((res) => {
        if (!cancelled) {
          setTopics(res.data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return { topics, isLoading, error };
}
