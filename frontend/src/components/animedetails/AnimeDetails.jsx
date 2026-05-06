import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import './AnimeDetails.css'
import { Header } from '../header/Header';
import { DoorTransition } from '../doortransition/DoorTransition';
import { useAddToList, useIsAnimeInList } from '../../hooks/useAnimeQueries';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ProductionStaff } from './ProductionStaff';
import { VoiceActors } from './VoiceActors';
import { useAuth } from '../../contexts/AuthContext';
import { jikanAPI } from '../../services/api';

export function AnimeDetails() {
    const { slug } = useParams()
    const id = slug.split('-').pop()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const [anime, setAnime] = useState(null)
    const [pictures, setPictures] = useState([])
    const [characters, setCharacters] = useState([])
    const [episodes, setEpisodes] = useState([])
    const [seasons, setSeasons] = useState([])
    const [selectedSeason, setSelectedSeason] = useState(null)
    const [loadingEpisodes, setLoadingEpisodes] = useState(false)
    const [loading, setLoading] = useState(false)

    usePageMeta({
        title: anime ? `RankOtaku: ${anime.title} Quiz & Details` : 'RankOtaku Anime Details',
        description: anime
            ? `Read synopsis, stats, characters, and start a ${anime.title} quiz on RankOtaku.`
            : 'Discover anime details and start quizzes on RankOtaku.',
        keywords: 'anime details, anime quiz, RankOtaku, anime statistics'
    });
    const [showDoor, setShowDoor] = useState(true)
    const [showQuizTypeModal, setShowQuizTypeModal] = useState(false)
    const [completedCharacters, setCompletedCharacters] = useState([])

    const addToListMutation = useAddToList();
    const isInList = useIsAnimeInList(parseInt(id));

    const handleAddToList = () => {
        if (!anime) return;

        // Check if user is authenticated
        if (!isAuthenticated) {
            // Redirect to login page
            navigate('/auth', {
                state: {
                    from: `/anime/${slug}`,
                    message: 'Please login to add anime to your list'
                }
            });
            return;
        }

        addToListMutation.mutate({
            animeId: anime.mal_id,
            title: anime.title,
            image: anime.images.jpg.large_image_url,
            score: anime.score,
            episodes: anime.episodes,
            status: anime.status
        });
    };

    const handleStartQuizClick = () => {
        setShowQuizTypeModal(true);
    };

    const startAnimeQuiz = async () => {
        setShowQuizTypeModal(false);
        // Check localStorage first
        const cachedQuiz = localStorage.getItem(`quiz_${anime.title}`);
        if (cachedQuiz) {
            const quizData = JSON.parse(cachedQuiz);
            navigate('/quiz', {
                state: {
                    quiz: quizData.quiz,
                    quizId: quizData.quizId,
                    animeTitle: anime.title,
                    animeImage: anime.images.jpg.large_image_url,
                    characters: characters,
                    quizType: 'anime'
                }
            });
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/generate-quiz`, {
                animeTitle: anime.title
            });

            // Cache in localStorage for this session
            localStorage.setItem(`quiz_${anime.title}`, JSON.stringify({
                quiz: response.data.quiz,
                quizId: response.data.quizId
            }));

            navigate('/quiz', {
                state: {
                    quiz: response.data.quiz,
                    quizId: response.data.quizId,
                    animeTitle: anime.title,
                    animeImage: anime.images.jpg.large_image_url,
                    characters: characters,
                    quizType: 'anime'
                }
            });
        } catch (error) {
            console.error('Error generating quiz:', error);
            alert('Failed to generate quiz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const startCharacterQuiz = () => {
        setShowQuizTypeModal(false);
        // Filter out completed characters
        const availableCharacters = characters.filter(
            char => !completedCharacters.includes(char.character.mal_id)
        );

        if (availableCharacters.length === 0) {
            alert('You have completed quizzes for all characters!');
            return;
        }

        // Navigate to character selection page
        navigate('/character-selection', {
            state: {
                characters: availableCharacters,
                animeTitle: anime.title,
                animeImage: anime.images.jpg.large_image_url,
                animeId: id,
                completedCharacters: completedCharacters
            }
        });
    };

    useEffect(() => {
        const fromQuiz = window.history.state?.usr?.fromQuiz;

        setAnime(null);
        setPictures([]);
        setCharacters([]);
        setEpisodes([]);
        setShowDoor(!fromQuiz);

        // Load completed characters from localStorage
        const completed = JSON.parse(localStorage.getItem(`completed_characters_${id}`) || '[]');
        setCompletedCharacters(completed);

        const API = import.meta.env.VITE_API_URL;
        
        // Fetch main anime data first
        axios.get(`${API}/api/jikan/anime/${id}`)
            .then(res => { 
                setAnime(res.data.data);
                
                // Store anime data in MongoDB for caching (fire and forget)
                axios.post(`${API}/api/store-anime-data/${id}`, {
                    title: res.data.data.title
                }).catch(err => {
                    console.log('Background caching failed (non-critical):', err.message);
                });
            })

        // Stagger API calls to avoid rate limiting
        setTimeout(() => {
            axios.get(`${API}/api/jikan/anime/${id}/pictures`)
                .then(res => { setPictures(res.data.data) })
                .catch(err => console.log('Pictures failed:', err.message));
        }, 500);

        setTimeout(() => {
            axios.get(`${API}/api/jikan/anime/${id}/characters`)
                .then(res => { setCharacters(res.data.data) })
                .catch(err => console.log('Characters failed:', err.message));
        }, 1000);

        // Fetch seasons/related anime with delay
        setTimeout(() => {
            axios.get(`${API}/api/jikan/anime/${id}/relations`)
                .then(res => {
                    console.log('Relations loaded:', (res.data.data || []).length, 'relations');
                    const relationsData = res.data.data || [];
                    const seasonAnime = relationsData.filter(rel => 
                        rel.relation === 'Sequel' || 
                        rel.relation === 'Prequel' || 
                        rel.relation === 'Season' ||
                        rel.relation === 'Alternative version'
                    );
                    console.log('Filtered seasons:', seasonAnime.length, 'seasons');
                    setSeasons(seasonAnime);
                })
            .catch(err => {
                console.error('Error fetching seasons:', err);
                // Always set empty array on any error to prevent UI issues
                setSeasons([]);
                
                if (err.response?.status === 429) {
                    console.log('Rate limited - will retry seasons later');
                    // Retry after 3 seconds for rate limit
                    setTimeout(() => {
                        axios.get(`${API}/api/jikan/anime/${id}/relations`)
                            .then(res => {
                                const relationsData = res.data.data || [];
                                const seasonAnime = relationsData.filter(rel => 
                                    rel.relation === 'Sequel' || 
                                    rel.relation === 'Prequel' || 
                                    rel.relation === 'Season' ||
                                    rel.relation === 'Alternative version'
                                );
                                setSeasons(seasonAnime);
                            })
                            .catch(() => {
                                console.log('Retry failed, keeping empty seasons');
                                setSeasons([]);
                            });
                    }, 3000);
                } else if (err.response?.status === 500) {
                    console.log('Server error - seasons unavailable for this anime');
                } else {
                    console.log('Network or other error - seasons unavailable');
                }
            });
        }, 1500); // 1.5 second delay for relations

        // Fetch episodes for main anime with longer delay to avoid rate limiting
        setLoadingEpisodes(true);
        setTimeout(() => {
            axios.get(`${API}/api/jikan/anime/${id}/episodes`)
                .then(res => { 
                    console.log('Episodes data loaded:', (res.data.data || []).length, 'episodes');
                    const episodesData = res.data.data || [];
                    
                    // Try to fetch episode images if available
                    const episodesWithImages = episodesData.map((episode, index) => {
                        // Create a more reliable thumbnail system
                        // Use anime poster with episode number overlay as fallback
                        episode.thumbnailUrl = anime?.images?.jpg?.large_image_url;
                        
                        // Try different thumbnail URL patterns
                        if (episode.mal_id) {
                            // Pattern 1: Direct episode thumbnail (if exists)
                            episode.possibleThumbnails = [
                                `https://cdn.myanimelist.net/images/anime/episode/${episode.mal_id}.jpg`,
                                `https://cdn.myanimelist.net/images/anime/${Math.floor(id / 1000)}/${id}_${episode.mal_id}.jpg`,
                                anime?.images?.jpg?.large_image_url // Fallback to anime poster
                            ];
                        }
                        return episode;
                    });
                    
                    setEpisodes(episodesWithImages);
                    setLoadingEpisodes(false);
                })
                .catch(err => {
                    console.error('Error fetching episodes:', err);
                    if (err.response?.status === 429) {
                        console.log('Rate limited - episodes will show as unavailable');
                        // Don't retry immediately to avoid more rate limiting
                        setTimeout(() => {
                            console.log('Retrying episodes after rate limit...');
                            axios.get(`${API}/api/jikan/anime/${id}/episodes`)
                                .then(res => {
                                    const episodesData = res.data.data || [];
                                    const episodesWithImages = episodesData.map((episode, index) => {
                                        episode.thumbnailUrl = anime?.images?.jpg?.large_image_url;
                                        return episode;
                                    });
                                    setEpisodes(episodesWithImages);
                                    setLoadingEpisodes(false);
                                })
                                .catch(() => {
                                    setEpisodes([]);
                                    setLoadingEpisodes(false);
                                });
                        }, 5000); // Wait 5 seconds before retry
                    } else {
                        setEpisodes([]);
                        setLoadingEpisodes(false);
                    }
                });
        }, 2000); // Increased delay to 2 seconds

    }, [id])

    // Load episodes when season changes
    useEffect(() => {
        if (selectedSeason) {
            setLoadingEpisodes(true);
            const API = import.meta.env.VITE_API_URL;
            // Add delay to avoid rate limiting
            setTimeout(() => {
                axios.get(`${API}/api/jikan/anime/${selectedSeason}/episodes`)
                    .then(res => {
                        setEpisodes(res.data.data || []);
                        setLoadingEpisodes(false);
                    })
                    .catch(err => {
                        console.error('Error fetching season episodes:', err);
                        if (err.response?.status === 429) {
                            console.log('Rate limited - retrying in 3 seconds');
                            setTimeout(() => {
                                axios.get(`${API}/api/jikan/anime/${selectedSeason}/episodes`)
                                    .then(res => {
                                        setEpisodes(res.data.data || []);
                                        setLoadingEpisodes(false);
                                    })
                                    .catch(() => {
                                        setEpisodes([]);
                                        setLoadingEpisodes(false);
                                    });
                            }, 3000);
                        } else {
                            setEpisodes([]);
                            setLoadingEpisodes(false);
                        }
                    });
            }, 500);
        }
    }, [selectedSeason])

    if (!anime) return null

    return (
        <>
            <Helmet>
                <title>{anime.title} Quiz | RankOtaku</title>
                <meta
                    name="description"
                    content={`Play ${anime.title} quiz and test your anime knowledge on RankOtaku. Challenge yourself with questions about ${anime.title} characters, story, and battles.`}
                />
                <meta name="keywords" content={`${anime.title} quiz, ${anime.title} trivia, anime quiz, ${anime.genres.map(g => g.name).join(', ')}`} />
                <meta property="og:title" content={`${anime.title} Quiz | RankOtaku`} />
                <meta property="og:description" content={`Play ${anime.title} quiz and test your anime knowledge on RankOtaku`} />
                <meta property="og:image" content={anime.images.jpg.large_image_url} />
                <meta property="og:type" content="website" />
            </Helmet>
            {showDoor && <DoorTransition onComplete={() => setShowDoor(false)} />}
            <div className='anime-details-container'>
                {/* Hero Banner */}
                <div className='anime-hero' style={{ backgroundImage: `url(${anime.images.jpg.large_image_url})` }}>
                    <Header />
                    <div className='anime-hero-content'>
                        <img src={anime.images.jpg.large_image_url} alt={anime.title} className='anime-poster' />
                        <div className='anime-hero-info'>
                            <h1 style={{ 
                                fontWeight: 'bold',
                                fontSize: '4rem',
                                color: '#ffffff',
                                fontFamily: 'Arial, sans-serif',
                                background: 'none',
                                backgroundClip: 'unset',
                                WebkitBackgroundClip: 'unset',
                                WebkitTextFillColor: '#ffffff',
                                textShadow: 'none'
                            }}>{anime.title}</h1>
                            <div className='anime-meta'>
                                <span className='meta-badge'>{anime.type}</span>
                                <span className='meta-badge'>{anime.status}</span>
                                <span className='meta-badge'>{anime.episodes} Episodes</span>
                            </div>
                            <div className='anime-stats'>
                                <div className='stat'>
                                    <span className='stat-value'>⭐ {anime.score}</span>
                                    <span className='stat-label'>Score</span>
                                </div>
                                <div className='stat'>
                                    <span className='stat-value'>#{anime.rank}</span>
                                    <span className='stat-label'>Rank</span>
                                </div>
                                <div className='stat'>
                                    <span className='stat-value'>#{anime.popularity}</span>
                                    <span className='stat-label'>Popularity</span>
                                </div>
                            </div>
                            <div className='anime-genres'>
                                {anime.genres.map((g, i) => (
                                    <span key={i} className='genre-tag'>{g.name}</span>
                                ))}
                            </div>
                            <div className='anime-actions'>
                                <button className='btn-primary-large' onClick={handleStartQuizClick} disabled={loading}>
                                    {loading ? 'Generating Quiz...' : 'Start Quiz'}
                                </button>
                                <button
                                    className='btn-secondary-large'
                                    onClick={handleAddToList}
                                    disabled={isAuthenticated && (isInList || addToListMutation.isPending)}
                                >
                                    {!isAuthenticated ? 'Login to Add to List' :
                                        isInList ? '✓ In My List' :
                                            addToListMutation.isPending ? 'Adding...' : 'Add to My List'}
                                </button>
                            </div>
                        </div>
                        
                        {/* About Section - Right Side */}
                        <div className="about-section" style={{
                            position: 'absolute',
                            right: '-50px',
                            top: '120px',
                            width: '400px',
                            color: '#fff',
                            padding: '0',
                            zIndex: 10
                        }}>
                            <h3 style={{
                                color: '#ffd700',
                                fontSize: '22px',
                                fontWeight: 'bold',
                                margin: '0 0 20px 0',
                                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                            }}>
                                About {anime.title}
                            </h3>
                            
                            <p style={{
                                color: '#fff',
                                fontSize: '15px',
                                lineHeight: '1.7',
                                margin: '0 0 25px 0',
                                textAlign: 'justify',
                                textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
                                fontWeight: '400'
                            }}>
                                {anime.synopsis}
                            </p>
                            
                            {/* Quick Info */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px 20px',
                                fontSize: '14px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '4px' }}>Type:</span>
                                    <span style={{ color: '#fff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }}>{anime.type}</span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '4px' }}>Episodes:</span>
                                    <span style={{ color: '#fff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }}>{anime.episodes}</span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '4px' }}>Status:</span>
                                    <span style={{ color: '#fff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }}>{anime.status}</span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '4px' }}>Aired:</span>
                                    <span style={{ color: '#fff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }}>
                                        {anime.aired?.string?.replace(' to ', ' to\n')}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                                    <span style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '4px' }}>Studio:</span>
                                    <span style={{ color: '#fff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }}>
                                        {anime.studios?.map(s => s.name).join(', ') || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Section for Mobile */}
                <div className='content-section mobile-about-section'>
                    <h2 className='section-title'>About {anime.title}</h2>
                    <div className='synopsis-section'>
                        <p className='synopsis-text'>{anime.synopsis}</p>
                        
                        <div className='info-grid'>
                            <div className='info-item'>
                                <span className='info-label'>Type</span>
                                <span className='info-value'>{anime.type}</span>
                            </div>
                            <div className='info-item'>
                                <span className='info-label'>Episodes</span>
                                <span className='info-value'>{anime.episodes}</span>
                            </div>
                            <div className='info-item'>
                                <span className='info-label'>Status</span>
                                <span className='info-value'>{anime.status}</span>
                            </div>
                            <div className='info-item'>
                                <span className='info-label'>Aired</span>
                                <span className='info-value'>{anime.aired?.string || 'N/A'}</span>
                            </div>
                            <div className='info-item'>
                                <span className='info-label'>Studio</span>
                                <span className='info-value'>{anime.studios?.map(s => s.name).join(', ') || 'N/A'}</span>
                            </div>
                            <div className='info-item'>
                                <span className='info-label'>Score</span>
                                <span className='info-value'>⭐ {anime.score}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Episodes Section */}
                <div className='content-section'>
                    <h2 className='section-title'>Episodes & Seasons</h2>
                    
                    {/* Seasons - only show if there are related seasons */}
                    {seasons && seasons.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ color: '#ffd700', marginBottom: '15px', fontSize: '18px' }}>Related Seasons</h3>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                <button
                                    onClick={() => setSelectedSeason(null)}
                                    style={{
                                        padding: '12px 20px',
                                        background: selectedSeason === null ? '#ffd700' : '#2a2a2a',
                                        color: 'white',
                                        border: selectedSeason === null ? '2px solid #ffd700' : '2px solid #444',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    📺 {anime.title} (Current)
                                </button>
                                {seasons.map((season, index) => (
                                    season.entry && season.entry.map((entry, entryIndex) => (
                                        <button
                                            key={`${index}-${entryIndex}`}
                                            onClick={() => setSelectedSeason(entry.mal_id)}
                                            style={{
                                                padding: '12px 20px',
                                                background: selectedSeason === entry.mal_id ? '#ffd700' : '#2a2a2a',
                                                color: 'white',
                                                border: selectedSeason === entry.mal_id ? '2px solid #ffd700' : '2px solid #444',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            🎬 {entry.name}
                                        </button>
                                    ))
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Episodes Grid - Crunchyroll Style */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px' }}>
                            <h3 style={{ color: '#ffd700', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                                📺 Episodes ({episodes ? episodes.length : 0})
                            </h3>
                            {episodes && episodes.length > 0 && (
                                <span style={{ 
                                    background: 'linear-gradient(45deg, #ffd700, #ffed4e)', 
                                    color: 'white', 
                                    padding: '8px 16px', 
                                    borderRadius: '25px', 
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
                                }}>
                                    {episodes.length} Episodes Available
                                </span>
                            )}
                        </div>
                        
                        {loadingEpisodes ? (
                            <div className="episodes-loading">
                                <div className="loading-content">
                                    <div className="loading-spinner">⏳</div>
                                    <p>Loading Episodes...</p>
                                </div>
                            </div>
                        ) : episodes && episodes.length > 0 ? (
                            <div className="episodes-container">
                                <div className="episodes-list">
                                    {episodes.map((episode, index) => (
                                        <div key={episode.mal_id || index} className="episode-card">
                                            {/* Episode Thumbnail */}
                                            <div className="episode-thumbnail" style={{
                                                backgroundImage: `url(${episode.thumbnailUrl || anime.images?.jpg?.large_image_url})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                position: 'relative'
                                            }}>
                                                <div className="play-button">▶️</div>
                                                <div className="episode-number">EP {episode.mal_id || index + 1}</div>
                                                <div className="episode-duration">{anime.duration || '24 min'}</div>
                                            </div>
                                            
                                            {/* Episode Info */}
                                            <div className="episode-info">
                                                <div className="episode-content">
                                                    <h4 className="episode-title">
                                                        {episode.title || `Episode ${episode.mal_id || index + 1}`}
                                                    </h4>
                                                    
                                                    {episode.synopsis && (
                                                        <p className="episode-synopsis">
                                                            {episode.synopsis}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <div className="episode-footer">
                                                    {episode.aired && (
                                                        <div className="episode-date">
                                                            📅 {new Date(episode.aired).toLocaleDateString('en-US', { 
                                                                year: 'numeric', 
                                                                month: 'short', 
                                                                day: 'numeric' 
                                                            })}
                                                        </div>
                                                    )}
                                                    
                                                    <a href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.title + ' episode ' + (episode.mal_id || index + 1))}`}
                                                       target="_blank" rel="noopener noreferrer"
                                                       className="watch-button">
                                                        🎬 Watch
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="episodes-empty">
                                <div className="empty-content">
                                    <div className="empty-icon">📺</div>
                                    <h4>Episodes Loading...</h4>
                                    <p>Episodes are being fetched from MyAnimeList. This may take a moment due to API rate limits.</p>
                                    <button onClick={() => window.location.reload()} className="refresh-button">
                                        🔄 Refresh Page
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Characters */}
                {characters.length > 0 && (
                    <div className='content-section'>
                        <h2 className='section-title'>Characters</h2>
                        <div className='characters-grid'>
                            {characters.map((char, index) => (
                                <div key={index} className='character-card-new'>
                                    <img src={char.character.images.jpg.image_url} alt={char.character.name} />
                                    <div className='character-info'>
                                        <p className='character-name'>{char.character.name}</p>
                                        <p className='character-role'>{char.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Compact Voice Actors */}
                {characters.length > 0 && (
                    <div className='content-section'>
                        <h2 className='section-title'>Voice Actors</h2>
                        <div style={{
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                            padding: '20px',
                            borderRadius: '12px',
                            border: '1px solid #333'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '15px'
                            }}>
                                {characters.slice(0, 6).map((char, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px',
                                        background: 'rgba(255, 215, 0, 0.05)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 215, 0, 0.2)'
                                    }}>
                                        <img 
                                            src={char.character.images.jpg.image_url} 
                                            alt={char.character.name}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ color: '#fff', fontSize: '14px', margin: '0 0 4px 0', fontWeight: '500' }}>
                                                {char.character.name}
                                            </p>
                                            <p style={{ color: '#ffd700', fontSize: '12px', margin: '0', fontWeight: 'bold' }}>
                                                {char.role}
                                            </p>
                                            {char.voice_actors && char.voice_actors.length > 0 && (
                                                <p style={{ color: '#ccc', fontSize: '11px', margin: '2px 0 0 0' }}>
                                                    {char.voice_actors[0].person.name} ({char.voice_actors[0].language})
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {characters.length > 6 && (
                                <p style={{ color: '#999', fontSize: '12px', textAlign: 'center', margin: '15px 0 0 0' }}>
                                    Showing 6 of {characters.length} characters with voice actors
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Background */}
                {anime.background && (
                    <div className='content-section'>
                        <h2 className='section-title'>Background</h2>
                        <p className='synopsis-text'>{anime.background}</p>
                    </div>
                )}
            </div>

            {/* Quiz Type Selection Modal */}
            {showQuizTypeModal && (
                <div className='quiz-type-modal-overlay' onClick={() => setShowQuizTypeModal(false)}>
                    <div className='quiz-type-modal' onClick={(e) => e.stopPropagation()}>
                        <h2>Select Quiz Type</h2>
                        <p>Choose the type of quiz you want to take</p>
                        <div className='quiz-type-buttons'>
                            <button className='quiz-type-btn anime-quiz-btn' onClick={startAnimeQuiz}>
                                <div className='quiz-type-btn-header'>
                                    <h3>Anime Quiz</h3>
                                    <p>Questions about the anime story, plot, and general knowledge</p>
                                </div>
                                <div className='quiz-type-btn-image'></div>
                            </button>
                            <button className='quiz-type-btn character-quiz-btn' onClick={startCharacterQuiz}>
                                <div className='quiz-type-btn-header'>
                                    <h3>Character Quiz</h3>
                                    <p>Questions focused on specific characters from the anime</p>
                                </div>
                                <div className='quiz-type-btn-image'></div>
                            </button>
                        </div>
                        <button className='close-modal-btn' onClick={() => setShowQuizTypeModal(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </>
    )


}
