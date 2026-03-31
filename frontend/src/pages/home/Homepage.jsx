import React from 'react'
import { Header } from '../../components/header/Header';
import { Herosection } from './Herosection';
import { Footer } from '../../components/footer/Footer';
import './Homepage.css';
import axios from 'axios';
import { Strip } from './Strip';
import { Search } from './Search';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Anime } from './Anime';

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
  const [displayCounts, setDisplayCounts] = React.useState({
    top: 10,
    trending: 10,
    airing: 10,
    movies: 10
  });
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

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

  const loadMoreAnime = React.useCallback(async (category) => {
    setIsLoadingMore(true);
    try {
      const newCount = displayCounts[category] + 10;
      let response;

      // Fetch more data from API based on category
      if (category === 'top') {
        response = await axios.get(`https://api.jikan.moe/v4/top/anime?filter=bypopularity&page=${Math.ceil(newCount / 25)}&limit=25`);
        // Keep existing anime and add new ones
        setCategories(prev => ({
          ...prev,
          // For top, we'll handle this separately in the state
        }));
      } else if (category === 'trending') {
        response = await axios.get(`https://api.jikan.moe/v4/seasons/now?page=${Math.ceil(newCount / 25)}&limit=25`);
        setCategories(prev => ({
          ...prev,
          trending: [...prev.trending, ...response.data.data]
        }));
      } else if (category === 'airing') {
        response = await axios.get(`https://api.jikan.moe/v4/seasons/now?page=${Math.ceil(newCount / 25)}&limit=25`);
        setCategories(prev => ({
          ...prev,
          airing: [...prev.airing, ...response.data.data]
        }));
      } else if (category === 'movies') {
        response = await axios.get(`https://api.jikan.moe/v4/top/anime?type=movie&page=${Math.ceil(newCount / 25)}&limit=25`);
        setCategories(prev => ({
          ...prev,
          movies: [...prev.movies, ...response.data.data]
        }));
      }

      // Update display count
      setDisplayCounts(prev => ({
        ...prev,
        [category]: newCount
      }));
    } catch (error) {
      console.error(`Error loading more ${category} anime:`, error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [displayCounts]);

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
          {(activeCategory === 'all' || activeCategory === 'top') && (
            <MemoizedAnime 
              anime={anime?.slice(0, displayCounts.top)} 
              title="Top Rated Anime" 
              category="top"
              onLoadMore={loadMoreAnime}
              isLoadingMore={isLoadingMore}
            />
          )}
          {(activeCategory === 'all' || activeCategory === 'trending') && (
            <MemoizedAnime 
              anime={categories.trending?.slice(0, displayCounts.trending)} 
              title="Trending Anime" 
              category="trending"
              onLoadMore={loadMoreAnime}
              isLoadingMore={isLoadingMore}
            />
          )}
          {(activeCategory === 'all' || activeCategory === 'airing') && (
            <MemoizedAnime 
              anime={categories.airing?.slice(0, displayCounts.airing)} 
              title="Currently Airing" 
              category="airing"
              onLoadMore={loadMoreAnime}
              isLoadingMore={isLoadingMore}
            />
          )}
          {(activeCategory === 'all' || activeCategory === 'movies') && (
            <MemoizedAnime 
              anime={categories.movies?.slice(0, displayCounts.movies)} 
              title="Top Anime Movies" 
              category="movies"
              onLoadMore={loadMoreAnime}
              isLoadingMore={isLoadingMore}
            />
          )}
        </>
      )}
      <Footer />
    </div>
  );
}
