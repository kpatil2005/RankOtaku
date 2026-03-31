import React from 'react'
import { Header } from '../../components/header/Header';
import { Anime } from './Anime';
import { Herosection } from './Herosection';
import { Footer } from '../../components/footer/Footer';
import './Homepage.css';
import axios from 'axios';
import { Strip } from './Strip';
import { Search } from './Search';
import { usePageMeta } from '../../hooks/usePageMeta';

const MemoizedAnime = React.memo(Anime);

export function Homepage({ anime }) {
  const [categories, setCategories] = React.useState({
    trending: [],
    airing: [],
    movies: []
  });
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [isSearchActive, setIsSearchActive] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  usePageMeta({
    title: 'RankOtaku | Home - Anime Quizzes & Leaderboard',
    description: 'Discover top anime quizzes and compete on global leaderboards with RankOtaku.',
    keywords: 'anime quiz, anime trivia, otaku leaderboard, anime challenge, RankOtaku'
  });

  React.useEffect(() => {
    const CACHE_KEY = 'homepage_categories';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Check cache first
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setCategories(data);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error parsing cache:', error);
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    const controller = new AbortController();
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    setIsLoading(true);

    Promise.all([
      axios.get('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=10', {
        signal: controller.signal
      }),
      delay(1000).then(() => axios.get('https://api.jikan.moe/v4/seasons/now?limit=10', {
        signal: controller.signal
      })),
      delay(2000).then(() => axios.get('https://api.jikan.moe/v4/top/anime?type=movie&limit=10', {
        signal: controller.signal
      }))
    ]).then(([trending, airing, movies]) => {
      const data = {
        trending: trending.data.data,
        airing: airing.data.data,
        movies: movies.data.data
      };
      
      setCategories(data);
      setIsLoading(false);
      
      // Cache the data
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }).catch(error => {
      if (error.name !== 'AbortError') {
        console.error('Error fetching anime data:', error);
        setIsLoading(false);
      }
    });

    return () => controller.abort();
  }, []);

  const handleCategoryChange = React.useCallback((category) => {
    setActiveCategory(category);
  }, []);

  const handleSearchStateChange = React.useCallback((searchState) => {
    setIsSearchActive(searchState.isSearching);
  }, []);

  return (
    <div className='homepage'>
      <Header />
      <Herosection />
      <Strip />
      <Search 
        onCategoryChange={handleCategoryChange}
        onSearchStateChange={handleSearchStateChange}
      />

      {/* Loading state */}
      {isLoading && !isSearchActive && (
        <div className="loading-categories">
          <p>Loading anime categories...</p>
        </div>
      )}

      {/* Show sections when not searching and not loading */}
      {!isSearchActive && !isLoading && (
        <>
          {(activeCategory === 'all' || activeCategory === 'top') && 
            <MemoizedAnime anime={anime} title="Top Rated Anime" />}
          {(activeCategory === 'all' || activeCategory === 'trending') && 
            <MemoizedAnime anime={categories.trending} title="Trending Anime" />}
          {(activeCategory === 'all' || activeCategory === 'airing') && 
            <MemoizedAnime anime={categories.airing} title="Currently Airing" />}
          {(activeCategory === 'all' || activeCategory === 'movies') && 
            <MemoizedAnime anime={categories.movies} title="Top Anime Movies" />}
        </>
      )}
      <Footer />
    </div>
  );
}
