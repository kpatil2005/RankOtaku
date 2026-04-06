import React, { Suspense } from 'react'
import { Header } from '../../components/header/Header';
import { Herosection } from './Herosection';
import { Footer } from '../../components/footer/Footer';
import { FeaturedCarousel } from '../../components/FeaturedCarousel';
import { SEOHead } from '../../components/SEO/SEOHead';
import { SEOContent } from '../../components/SEO/SEOContent';
import { AnimeGridSkeleton } from '../../components/LoadingSkeleton';
import './Homepage.css';
import axios from 'axios';
import { Strip } from './Strip';
import { Search } from './Search';

// Lazy load Anime component to reduce initial JS
const Anime = React.lazy(() => import('./Anime').then(module => ({ default: module.Anime })));

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

  // SEO is now handled by SEOHead component, removing usePageMeta to avoid conflicts

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



    setIsLoading(true);

    const API = import.meta.env.VITE_API_URL;
    Promise.all([
      axios.get(`${API}/api/jikan/top/popularity`),
      axios.get(`${API}/api/jikan/seasons/now`),
      axios.get(`${API}/api/jikan/top/movies`)
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
      console.error('Error fetching anime data:', error);
      setIsLoading(false);
    });


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
      <SEOHead
        title="RankOtaku - Ultimate Anime Quiz & Ranking Platform | Test Your Otaku Knowledge"
        description="Test your anime knowledge with thousands of quizzes! Compete on global leaderboards, discover top anime rankings, and join the ultimate otaku community. Play now!"
        keywords="anime quiz, anime trivia, otaku games, anime leaderboard, anime ranking, anime player, anime knowledge test, otaku quiz, anime challenge, RankOtaku, anime competition, manga quiz, anime games online, otaku community"
        url="https://rankotaku-frontend.onrender.com/"
      />
      <Header />
      <Herosection />

      <Strip />



      <FeaturedCarousel />

      <Search
        onCategoryChange={handleCategoryChange}
        onSearchStateChange={handleSearchStateChange}
      />

      {/* Loading state */}
      {isLoading && !isSearchActive && (
        <div className="loading-categories">
          <AnimeGridSkeleton count={6} />
        </div>
      )}

      {/* Show sections when not searching and not loading */}
      {!isSearchActive && !isLoading && (
        <>
          {(activeCategory === 'all' || activeCategory === 'top') && (
            <Suspense fallback={<AnimeGridSkeleton count={6} />}>
              <Anime
                anime={anime?.slice(0, displayCounts.top)}
                title="Top Rated Anime"
                category="top"
                onLoadMore={loadMoreAnime}
                isLoadingMore={isLoadingMore}
              />
            </Suspense>
          )}
          {(activeCategory === 'all' || activeCategory === 'trending') && (
            <Suspense fallback={<AnimeGridSkeleton count={6} />}>
              <Anime
                anime={categories.trending?.slice(0, displayCounts.trending)}
                title="Trending Anime"
                category="trending"
                onLoadMore={loadMoreAnime}
                isLoadingMore={isLoadingMore}
              />
            </Suspense>
          )}
          {(activeCategory === 'all' || activeCategory === 'airing') && (
            <Suspense fallback={<AnimeGridSkeleton count={6} />}>
              <Anime
                anime={categories.airing?.slice(0, displayCounts.airing)}
                title="Currently Airing"
                category="airing"
                onLoadMore={loadMoreAnime}
                isLoadingMore={isLoadingMore}
              />
            </Suspense>
          )}
          {(activeCategory === 'all' || activeCategory === 'movies') && (
            <Suspense fallback={<AnimeGridSkeleton count={6} />}>
              <Anime
                anime={categories.movies?.slice(0, displayCounts.movies)}
                title="Top Anime Movies"
                category="movies"
                onLoadMore={loadMoreAnime}
                isLoadingMore={isLoadingMore}
              />
            </Suspense>
          )}
        </>
      )}

      <SEOContent />
      <Footer />
    </div>
  );
}
