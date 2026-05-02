import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api';
import { API } from '@/shared/config';
import type { Topic } from '@/shared/types';

interface UseTopicsReturn {
  topics: Topic[];
  isLoading: boolean;
  error: Error | null;
}

export function useTopics(): UseTopicsReturn {
  const { data, isLoading, error } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await api.get<Topic[]>(API.ENDPOINTS.TOPICS);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - topics rarely change
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
  });

  return {
    topics: data ?? [],
    isLoading,
    error,
  };
}
