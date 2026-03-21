import React from 'react';
import { useMyAnimeList, useRemoveFromList } from '../../hooks/useAnimeQueries';
import './MyAnimeList.css';

const ErrorMessage = ({ error, onRetry }) => (
  <div className="anime-list-error">
    <p>⚠️ {error}</p>
    <button onClick={onRetry} className="retry-btn">
      Try Again
    </button>
  </div>
);

const LoadingSpinner = () => (
  <div className="anime-list-loading">
    <div className="spinner"></div>
    <p>Loading your anime list...</p>
  </div>
);

const EmptyState = ({ onRefresh }) => (
  <div className="anime-list-empty">
    <p>No anime in your list yet. Add some from anime details pages!</p>
    <button onClick={onRefresh} className="refresh-btn">
      Refresh List
    </button>
  </div>
);

const AnimeCard = ({ anime }) => {
  const removeFromListMutation = useRemoveFromList();

  const handleRemove = () => {
    // Optimistic update happens instantly in the mutation
    removeFromListMutation.mutate(anime.animeId);
  };

  return (
    <div className={`anime-list-item ${removeFromListMutation.isPending ? 'removing' : ''}`}>
      <button 
        className="remove-btn"
        onClick={handleRemove}
        disabled={removeFromListMutation.isPending}
        title="Remove from list"
        aria-label={`Remove ${anime.title} from list`}
      >
        {removeFromListMutation.isPending ? '⏳' : '✕'}
      </button>
      <img 
        src={anime.image} 
        alt={anime.title} 
        className="anime-list-image"
        loading="lazy"
      />
      <h4 className="anime-list-title">{anime.title}</h4>
      <div className="anime-list-details">
        <span className="anime-score">⭐ {anime.score}</span>
        <span className="anime-status">{anime.status}</span>
      </div>
    </div>
  );
};

export function MyAnimeList() {
  const { data: animeList = [], isLoading, error, refetch } = useMyAnimeList();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error.response?.data?.error || error.message} onRetry={refetch} />;
  }

  if (animeList.length === 0) {
    return <EmptyState onRefresh={refetch} />;
  }

  return (
    <div className="my-anime-list">
      {animeList.map((anime) => (
        <AnimeCard 
          key={anime.animeId} 
          anime={anime}
        />
      ))}
    </div>
  );
}