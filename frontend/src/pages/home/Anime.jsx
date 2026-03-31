import React from 'react'
import './Anime.css'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { quizCache } from '../../utils/quizCache'

// Move AnimeCard outside component for proper memoization
const AnimeCard = React.memo(({ a, index, generateQuiz }) => {
    return (
        <Link
            to={`/anime/${a.mal_id}`}
            key={`${a.mal_id}-${index}`}
            style={{ textDecoration: 'none' }}
            onClick={() => generateQuiz(a.title)}
        >
            <div className='anime-card'>
                <img
                    src={a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url}
                    srcSet={`
                        ${a.images?.webp?.image_url || a.images?.jpg?.image_url} 200w,
                        ${a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url} 600w
                    `}
                    sizes="(max-width: 768px) 120px, 150px"
                    alt={a.title || 'Anime'}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchpriority={index === 0 ? "high" : "auto"}
                    importance={index === 0 ? "high" : "auto"}
                    decoding="async"
                    width="150"
                    height="220"
                    style={{ objectFit: 'cover' }}
                />
                <div className='anime-info'>
                    <h2>{a.title}</h2>
                    <p className='anime-rank'>Rank #{a.rank}</p>
                    <p>⭐ Score: {a.score}</p>
                    <p>👥 Members: {a.members?.toLocaleString()}</p>
                    <p>❤️ Favorites: {a.favorites?.toLocaleString()}</p>
                </div>
            </div>
        </Link>
    );
});

export function Anime({ anime, title = "Top Anime Battles", category = null, onLoadMore = null, isLoadingMore = false }) {
    const lastFetchTime = React.useRef({});
    const isTopRated = title === "Top Rated Anime";
    const isTrending = title === "Trending Anime";
    const isAiring = title === "Currently Airing";
    const isMovies = title === "Top Anime Movies";

    // First section loads immediately, others lazy load
    const isFirstSection = isTopRated;

    // State to control how many items are visible
    const [visibleCount, setVisibleCount] = React.useState(6);
    
    // Intersection Observer for lazy loading sections (except first)
    const [isVisible, setIsVisible] = React.useState(isFirstSection);
    const sectionRef = React.useRef();

    // Triple the anime array for truly seamless infinite scroll
    const animeList = anime || [];

    // Preload first image for LCP optimization with cleanup
    React.useEffect(() => {
        if (!isFirstSection || animeList.length === 0) return;

        const firstImage = animeList[0]?.images?.webp?.large_image_url 
            || animeList[0]?.images?.jpg?.large_image_url;
        if (!firstImage) return;

        const existing = document.querySelector(`link[href="${firstImage}"]`);
        if (existing) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = firstImage;

        document.head.appendChild(link);

        return () => {
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, [animeList, isFirstSection]);

    // Intersection Observer setup
    React.useEffect(() => {
        if (isFirstSection) return; // First section doesn't need observer

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [isFirstSection]);

    const generateQuiz = (animeTitle) => {
        const now = new Date().getTime();
        const lastFetch = lastFetchTime.current[animeTitle];

        if (lastFetch && now - lastFetch < 300000) {
            console.log('Please wait 5 minutes before fetching again');
            return;
        }

        lastFetchTime.current[animeTitle] = now;

        axios.post(`${import.meta.env.VITE_API_URL}/api/generate-quiz`, {
            animeTitle: animeTitle
        })
            .then(response => {
                const quiz = response.data.quiz;
                quizCache[animeTitle] = quiz;

            })
            .catch(error => {
                console.error('Error generating quiz:', error);
                delete lastFetchTime.current[animeTitle];
            });
    };

    // Slice based on visible count for rendering
    const visibleAnime = animeList.slice(0, visibleCount);

    // Render first card separately for LCP boost
    const firstAnime = visibleAnime[0];
    const restAnime = visibleAnime.slice(1);

    // Simplified render function - no more chunks needed
    const renderAnimeWithLoadMore = (animeList, scrollClassName) => {
        return (
            <div style={{ width: '100%' }}>
                <div className='anime-scroll-wrapper'>
                    <div className={scrollClassName}>
                        {firstAnime && (
                            <AnimeCard 
                                key={`${firstAnime.mal_id}-0`}
                                a={firstAnime} 
                                index={0} 
                                generateQuiz={generateQuiz} 
                            />
                        )}
                        {restAnime?.map((a, index) => (
                            <AnimeCard 
                                key={`${a.mal_id}-${index + 1}`}
                                a={a} 
                                index={index + 1} 
                                generateQuiz={generateQuiz} 
                            />
                        ))}
                    </div>
                </div>
                {visibleCount < animeList.length && (
                    <div className="load-more-container" style={{ textAlign: 'center', margin: '20px 0' }}>
                        <button
                            className="load-more-btn"
                            onClick={() => setVisibleCount(prev => prev + 10)}
                            disabled={isLoadingMore}
                        >
                            {isLoadingMore ? 'Loading...' : 'Load More Anime'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className='anime-container' ref={sectionRef}>
            <h1>{title}</h1>
            {(isFirstSection || isVisible) && (
                <>
                    {isTopRated ? (
                        renderAnimeWithLoadMore(visibleAnime, 'anime-scroll-track')
                    ) : isTrending ? (
                        renderAnimeWithLoadMore(visibleAnime, 'anime-scroll-track-reverse')
                    ) : isAiring ? (
                        renderAnimeWithLoadMore(visibleAnime, 'anime-scroll-track')
                    ) : isMovies ? (
                        renderAnimeWithLoadMore(visibleAnime, 'anime-scroll-track-reverse')
                    ) : (
                        <div className='anime-scroll-wrapper'>
                            <div className='anime-scroll-track'>
                                {firstAnime && (
                                    <AnimeCard 
                                        key={`${firstAnime.mal_id}-0`}
                                        a={firstAnime} 
                                        index={0} 
                                        generateQuiz={generateQuiz} 
                                    />
                                )}
                                {restAnime?.map((a, index) => (
                                    <AnimeCard 
                                        key={`${a.mal_id}-${index + 1}`}
                                        a={a} 
                                        index={index + 1} 
                                        generateQuiz={generateQuiz} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


