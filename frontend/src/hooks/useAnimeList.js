import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { animeListAPI } from '../services/api';

export const useAnimeList = () => {
  const queryClient = useQueryClient();

  // Fetch anime list with React Query
  const {
    data: animeList = [],
    isLoading: loading,
    error,
    refetch: refreshList
  } = useQuery({
    queryKey: ['myAnimeList'],
    queryFn: async () => {
      const response = await animeListAPI.getMyList();
      return response.data.animeList || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Remove from list mutation
  const removeFromListMutation = useMutation({
    mutationFn: (animeId) => animeListAPI.removeFromList(animeId),
    onSuccess: () => {
      // Invalidate and refetch anime list
      queryClient.invalidateQueries({ queryKey: ['myAnimeList'] });
    },
    onError: (error) => {
      console.error('Failed to remove anime:', error);
    },
  });

  const removeFromList = async (animeId) => {
    try {
      await removeFromListMutation.mutateAsync(animeId);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to remove anime';
      return { success: false, error: errorMsg };
    }
  };

  return {
    animeList,
    loading,
    error: error?.response?.data?.error || error?.message,
    removeFromList,
    refreshList,
    isRemoving: removeFromListMutation.isPending,
  };
};