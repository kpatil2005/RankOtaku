import React from 'react'
import './Anime.css'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { quizCache } from '../../utils/quizCache'

export function Anime({ anime, title = "Top Anime Battles", category = null, onLoadMore = null, isLoadingMore = false }) {
    const lastFetchTime = React.useRef({});
    const isTopRated = title === "Top Rated Anime";
    const isTrending = title === "Trending Anime";
    const isAiring = title === "Currently Airing";
    const isMovies = title === "Top Anime Movies";

    // First section loads immediately, others lazy load
    const isFirstSection = isTopRated;

    // State to control how many items are visible
    const [visibleCount, setVisibleCount] = React.useState(10);
    
    // Intersection Observer for lazy loading sections (except first)
    const [isVisible, setIsVisible] = React.useState(isFirstSection);
    const sectionRef = React.useRef();

    React.useEffect(() => {
        // Skip intersection observer for first section
        if (isFirstSection) return;

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

    // Memoized AnimeCard to prevent unnecessary re-renders
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
                        src={index < 3 
                            ? (a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url)
                            : (a.images?.webp?.image_url || a.images?.jpg?.image_url)
                        }
                        srcSet={`
                            ${a.images?.webp?.image_url || a.images?.jpg?.image_url} 150w,
                            ${a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url} 300w
                        `}
                        sizes="150px"
                        alt={a.title || 'Anime'}
                        loading={index < 3 ? "eager" : "lazy"}
                        width="150"
                        height="220"
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

    // Triple the anime array for truly seamless infinite scroll
    const animeList = anime || [];
    
    // Slice based on visible count for rendering
    const visibleAnime = animeList.slice(0, visibleCount);

    // Simplified render function - no more chunks needed
    const renderAnimeWithLoadMore = (animeList, scrollClassName) => {
        return (
            <div style={{ width: '100%' }}>
                <div className='anime-scroll-wrapper'>
                    <div className={scrollClassName}>
                        {animeList?.map((a, index) => (
                            <AnimeCard 
                                key={a.mal_id} 
                                a={a} 
                                index={index} 
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
                                {visibleAnime?.map((a, index) => (
                                    <AnimeCard 
                                        key={a.mal_id} 
                                        a={a} 
                                        index={index} 
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


