import React from 'react'
import './Anime.css'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { quizCache } from '../../utils/quizCache'

export function Anime({ anime, title = "Top Anime Battles" }) {
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
    const tripleAnime = anime ? [ ...anime] : [];

    return (
        <div className='anime-container'>
            <h1>{title}</h1>
            {isTopRated ? (
                <div className='anime-scroll-wrapper'>
                    <div className='anime-scroll-track'>
                        {tripleAnime?.map((a, index) => (
                            <Link 
                                to={`/anime/${a.mal_id}`} 
                                key={`${a.mal_id}-${index}`}
                                style={{textDecoration: 'none'}}
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
            ) : isTrending ? (
                <div className='anime-scroll-wrapper'>
                    <div className='anime-scroll-track-reverse'>
                        {tripleAnime?.map((a, index) => (
                            <Link 
                                to={`/anime/${a.mal_id}`} 
                                key={`${a.mal_id}-${index}`}
                                style={{textDecoration: 'none'}}
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
            ) : isAiring ? (
                <div className='anime-scroll-wrapper'>
                    <div className='anime-scroll-track'>
                        {tripleAnime?.map((a, index) => (
                            <Link 
                                to={`/anime/${a.mal_id}`} 
                                key={`${a.mal_id}-${index}`}
                                style={{textDecoration: 'none'}}
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
            ) : isMovies ? (
                <div className='anime-scroll-wrapper'>
                    <div className='anime-scroll-track-reverse'>
                        {tripleAnime?.map((a, index) => (
                            <Link 
                                to={`/anime/${a.mal_id}`} 
                                key={`${a.mal_id}-${index}`}
                                style={{textDecoration: 'none'}}
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
            ) : (
                <div className='anime-grid'>
                    {anime?.map((a) => (
                        <Link 
                            to={`/anime/${a.mal_id}`} 
                            key={a.mal_id} 
                            style={{textDecoration: 'none'}}
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
            )}
        </div>
    );
}


