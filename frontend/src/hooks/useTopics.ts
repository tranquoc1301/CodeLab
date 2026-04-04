import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { API } from '@/config';
import type { Topic } from '@/types';

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
