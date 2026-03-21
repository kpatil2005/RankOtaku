import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { animeListAPI } from '../services/api';

// Query keys
export const QUERY_KEYS = {
  ANIME_LIST: ['myAnimeList'],
  ANIME_DETAILS: (id) => ['animeDetails', id],
};

// Hook for fetching anime list
export const useMyAnimeList = () => {
  return useQuery({
    queryKey: QUERY_KEYS.ANIME_LIST,
    queryFn: async () => {
      const response = await animeListAPI.getMyList();
      return response.data.animeList || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook for adding anime to list with optimistic updates
export const useAddToList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (animeData) => animeListAPI.addToList(animeData),
    onMutate: async (animeData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ANIME_LIST });

      // Snapshot previous value
      const previousAnimeList = queryClient.getQueryData(QUERY_KEYS.ANIME_LIST);

      // Optimistically add anime to list
      queryClient.setQueryData(QUERY_KEYS.ANIME_LIST, (old) => {
        const newAnime = {
          animeId: animeData.animeId,
          title: animeData.title,
          image: animeData.image,
          score: animeData.score,
          episodes: animeData.episodes,
          status: animeData.status,
          addedAt: new Date().toISOString(),
        };
        return old ? [...old, newAnime] : [newAnime];
      });

      return { previousAnimeList };
    },
    onError: (error, animeData, context) => {
      // Rollback on error
      queryClient.setQueryData(QUERY_KEYS.ANIME_LIST, context.previousAnimeList);
      console.error('Failed to add anime to list:', error);
    },
    onSuccess: () => {
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('animeListUpdated'));
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANIME_LIST });
    },
  });
};

// Hook for removing anime from list with enhanced optimistic updates
export const useRemoveFromList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (animeId) => {
      console.log('Removing anime:', animeId);
      return animeListAPI.removeFromList(animeId);
    },
    onMutate: async (animeId) => {
      console.log('onMutate: Starting optimistic update for', animeId);
      
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ANIME_LIST });

      // Snapshot previous value for rollback
      const previousAnimeList = queryClient.getQueryData(QUERY_KEYS.ANIME_LIST);
      console.log('Previous list:', previousAnimeList);

      // Optimistically remove anime from list (INSTANT UI UPDATE)
      queryClient.setQueryData(QUERY_KEYS.ANIME_LIST, (old) => {
        if (!old) return [];
        const newList = old.filter((anime) => anime.animeId !== animeId);
        console.log('New optimistic list:', newList);
        return newList;
      });

      // Return context for error handling
      return { previousAnimeList, animeId };
    },
    onError: (error, animeId, context) => {
      console.log('onError: Rolling back for', animeId);
      // Rollback to previous state on error
      if (context?.previousAnimeList) {
        queryClient.setQueryData(QUERY_KEYS.ANIME_LIST, context.previousAnimeList);
      }
      console.error('Failed to remove anime:', error);
    },
    onSuccess: (data, animeId) => {
      console.log('onSuccess: Successfully removed anime', animeId);
    },
    onSettled: () => {
      console.log('onSettled: Invalidating queries');
      // Always refetch to ensure data consistency with server
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANIME_LIST });
    },
  });
};

// Hook for checking if anime is in list (for button states)
export const useIsAnimeInList = (animeId) => {
  const { data: animeList = [] } = useMyAnimeList();
  return animeList.some(anime => anime.animeId === animeId);
};