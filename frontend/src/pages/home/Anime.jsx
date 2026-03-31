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

    // Triple the anime array for truly seamless infinite scroll
    const tripleAnime = anime ? [...anime] : [];

    // Helper function to render anime items with Load More buttons every 10 items
    const renderAnimeWithLoadMore = (animeList, scrollClassName) => {
        const chunks = [];
        for (let i = 0; i < animeList.length; i += 10) {
            const chunk = animeList.slice(i, i + 10);
            chunks.push(
                <div key={`chunk-${i}`} style={{ width: '100%' }}>
                    <div className='anime-scroll-wrapper'>
                        <div className={scrollClassName}>
                            {chunk?.map((a, index) => (
                                <Link
                                    to={`/anime/${a.mal_id}`}
                                    key={`${a.mal_id}-${index}`}
                                    style={{ textDecoration: 'none' }}
                                    onClick={() => generateQuiz(a.title)}
                                >
                                    <div className='anime-card'>
                                        <img src={a.images?.jpg?.image_url} alt={a.title || 'Anime'} />
                                        <div className='anime-info'>
                                            <h2>{a.title}</h2>
                                            <p className='anime-rank'>Rank #{a.rank}</p>
                                            <p>⭐ Score: {a.score}</p>
                                            <p>👥 Members: {a.members?.toLocaleString()}</p>
                                            <p>❤️ Favorites: {a.favorites?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                    {i + 10 < animeList.length && onLoadMore && category && (
                        <div className="load-more-container" style={{ textAlign: 'center', margin: '20px 0' }}>
                            <button
                                className="load-more-btn"
                                onClick={() => onLoadMore(category)}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading...' : 'Load More Anime'}
                            </button>
                        </div>
                    )}
                </div>
            );
        }
        return chunks;
    };

    return (
        <div className='anime-container'>
            <h1>{title}</h1>
            {isTopRated ? (
                renderAnimeWithLoadMore(tripleAnime, 'anime-scroll-track')
            ) : isTrending ? (
                renderAnimeWithLoadMore(tripleAnime, 'anime-scroll-track-reverse')
            ) : isAiring ? (
                renderAnimeWithLoadMore(tripleAnime, 'anime-scroll-track')
            ) : isMovies ? (
                renderAnimeWithLoadMore(tripleAnime, 'anime-scroll-track-reverse')
            ) : (
                <div className='anime-scroll-wrapper'>
                    <div className='anime-scroll-track'>
                        {tripleAnime?.map((a, index) => (
                            <Link
                                to={`/anime/${a.mal_id}`}
                                key={`${a.mal_id}-${index}`}
                                style={{ textDecoration: 'none' }}
                                onClick={() => generateQuiz(a.title)}
                            >
                                <div className='anime-card'>
                                    <img src={a.images?.jpg?.image_url} alt={a.title || 'Anime'} />
                                    <div className='anime-info'>
                                        <h2>{a.title}</h2>
                                        <p className='anime-rank'>Rank #{a.rank}</p>
                                        <p>⭐ Score: {a.score}</p>
                                        <p>👥 Members: {a.members?.toLocaleString()}</p>
                                        <p>❤️ Favorites: {a.favorites?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


