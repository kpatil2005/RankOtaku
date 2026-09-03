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
import { useAuth } from '../../contexts/AuthContext';
import { getAnimeDetails } from '../../services/anilist';

export function AnimeDetails() {
    const { slug } = useParams()
    const id = slug.split('-').pop()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const [anime, setAnime] = useState(null)
    const [characters, setCharacters] = useState([])
    const [episodes, setEpisodes] = useState([])
    const [staff, setStaff] = useState([])
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
    // id is AniList ID string — compare as number
    const isInList = useIsAnimeInList(Number(id));

    const handleAddToList = () => {
        if (!anime) return;
        if (!isAuthenticated) {
            navigate('/auth', { state: { from: `/anime/${slug}`, message: 'Please login to add anime to your list' } });
            return;
        }
        addToListMutation.mutate({
            animeId: anime.anilistId ?? anime.id,
            title: anime.title,
            image: anime.images.jpg.large_image_url,
            score: anime.score,
            episodes: anime.episodes,
            status: anime.status
        });
    };

    const handleStartQuizClick = () => setShowQuizTypeModal(true);

    const startAnimeQuiz = async () => {
        setShowQuizTypeModal(false);
        const cachedQuiz = localStorage.getItem(`quiz_${anime.title}`);
        if (cachedQuiz) {
            const quizData = JSON.parse(cachedQuiz);
            navigate('/quiz', {
                state: {
                    quiz: quizData.quiz,
                    quizId: quizData.quizId,
                    animeTitle: anime.title,
                    animeImage: anime.images.jpg.large_image_url,
                    characters,
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
                    characters,
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
        const availableCharacters = characters.filter(
            char => !completedCharacters.includes(char.character.mal_id)
        );
        if (availableCharacters.length === 0) {
            alert('You have completed quizzes for all characters!');
            return;
        }
        navigate('/character-selection', {
            state: {
                characters: availableCharacters,
                animeTitle: anime.title,
                animeImage: anime.images.jpg.large_image_url,
                animeId: id,
                completedCharacters
            }
        });
    };

    // Single AniList fetch — returns details, characters, staff, episodes, relations
    useEffect(() => {
        const fromQuiz = window.history.state?.usr?.fromQuiz;

        setAnime(null);
        setCharacters([]);
        setEpisodes([]);
        setStaff([]);
        setSeasons([]);
        setSelectedSeason(null);
        setShowDoor(!fromQuiz);
        setLoadingEpisodes(true);

        const completed = JSON.parse(localStorage.getItem(`completed_characters_${id}`) || '[]');
        setCompletedCharacters(completed);

        getAnimeDetails(id)
            .then(data => {
                if (!data) return;
                setAnime(data);
                setCharacters(data.characters ?? []);
                setStaff(data.staff ?? []);
                setEpisodes(data.episodeList ?? []);

                const seasonRelations = (data.relations ?? []).filter(rel =>
                    ['Sequel', 'Prequel', 'Season', 'Alternative version'].includes(rel.relation)
                );
                setSeasons(seasonRelations);
                setLoadingEpisodes(false);
            })
            .catch(err => {
                console.error('Error fetching anime details:', err);
                setLoadingEpisodes(false);
            });
    }, [id]);

    // When a related season is selected, load its episodes
    useEffect(() => {
        if (!selectedSeason) return;
        setLoadingEpisodes(true);
        getAnimeDetails(selectedSeason)
            .then(data => {
                setEpisodes(data?.episodes ?? []);
                setLoadingEpisodes(false);
            })
            .catch(() => {
                setEpisodes([]);
                setLoadingEpisodes(false);
            });
    }, [selectedSeason]);

    if (!anime) return null;

    return (
        <>
            <Helmet>
                <title>{anime.title} Quiz | RankOtaku</title>
                <meta name="description" content={`Play ${anime.title} quiz and test your anime knowledge on RankOtaku. Challenge yourself with questions about ${anime.title} characters, story, and battles.`} />
                <meta name="keywords" content={`${anime.title} quiz, ${anime.title} trivia, anime quiz, ${anime.genres.map(g => g.name).join(', ')}`} />
                <meta property="og:title" content={`${anime.title} Quiz | RankOtaku`} />
                <meta property="og:description" content={`Play ${anime.title} quiz and test your anime knowledge on RankOtaku`} />
                <meta property="og:image" content={anime.images.jpg.large_image_url} />
                <meta property="og:type" content="website" />
            </Helmet>

            {showDoor && <DoorTransition onComplete={() => setShowDoor(false)} />}

            <div className='anime-details-container'>
                {/* Hero Banner */}
                <div className='anime-hero' style={{ backgroundImage: `url(${anime.bannerImage || anime.images.jpg.large_image_url})` }}>
                    <Header />
                    <div className='anime-hero-content'>
                        <div className='hero-main-content'>
                            <img src={anime.images.jpg.large_image_url} alt={anime.title} className='anime-poster' />
                            <div className='anime-hero-info'>
                                <h1 className='anime-title'>{anime.title}</h1>
                                <div className='anime-meta'>
                                    <span className='meta-badge'>{anime.type}</span>
                                    <span className='meta-badge'>{anime.status}</span>
                                    {anime.episodes && <span className='meta-badge'>{anime.episodes} Episodes</span>}
                                </div>
                                <div className='anime-stats'>
                                    <div className='stat'>
                                        <span className='stat-value'>⭐ {anime.score ?? 'N/A'}</span>
                                        <span className='stat-label'>Score</span>
                                    </div>
                                    <div className='stat'>
                                        <span className='stat-value'>{anime.rank ? `#${anime.rank}` : 'N/A'}</span>
                                        <span className='stat-label'>Rank</span>
                                    </div>
                                    <div className='stat'>
                                        <span className='stat-value'>{anime.popularity ? `#${anime.popularity}` : 'N/A'}</span>
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
                        </div>

                        {/* About — desktop right column */}
                        <div className="about-section-desktop">
                            <h3 className='about-title'>About {anime.title}</h3>
                            <p className='about-synopsis'>{anime.synopsis}</p>
                            <div className='about-info-grid'>
                                <div className='about-info-item'><span className='about-label'>Type:</span><span className='about-value'>{anime.type}</span></div>
                                <div className='about-info-item'><span className='about-label'>Episodes:</span><span className='about-value'>{anime.episodes ?? 'N/A'}</span></div>
                                <div className='about-info-item'><span className='about-label'>Status:</span><span className='about-value'>{anime.status}</span></div>
                                <div className='about-info-item'><span className='about-label'>Aired:</span><span className='about-value'>{anime.aired?.string || 'N/A'}</span></div>
                                <div className='about-info-item about-studio'><span className='about-label'>Studio:</span><span className='about-value'>{anime.studios?.map(s => s.name).join(', ') || 'N/A'}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About — mobile */}
                <div className='content-section mobile-about-section'>
                    <h2 className='section-title'>About {anime.title}</h2>
                    <div className='synopsis-section'>
                        <p className='synopsis-text'>{anime.synopsis}</p>
                        <div className='info-grid'>
                            <div className='info-item'><span className='info-label'>Type</span><span className='info-value'>{anime.type}</span></div>
                            <div className='info-item'><span className='info-label'>Episodes</span><span className='info-value'>{anime.episodes ?? 'N/A'}</span></div>
                            <div className='info-item'><span className='info-label'>Status</span><span className='info-value'>{anime.status}</span></div>
                            <div className='info-item'><span className='info-label'>Aired</span><span className='info-value'>{anime.aired?.string || 'N/A'}</span></div>
                            <div className='info-item'><span className='info-label'>Studio</span><span className='info-value'>{anime.studios?.map(s => s.name).join(', ') || 'N/A'}</span></div>
                            <div className='info-item'><span className='info-label'>Score</span><span className='info-value'>⭐ {anime.score ?? 'N/A'}</span></div>
                        </div>
                    </div>
                </div>

                {/* Episodes & Seasons */}
                <div className='content-section'>
                    <h2 className='section-title'>Episodes & Seasons</h2>

                    {seasons && seasons.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ color: '#ffd700', marginBottom: '15px', fontSize: '18px' }}>Related Seasons</h3>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                <button
                                    onClick={() => setSelectedSeason(null)}
                                    style={{ padding: '12px 20px', background: selectedSeason === null ? '#ffd700' : '#2a2a2a', color: 'white', border: selectedSeason === null ? '2px solid #ffd700' : '2px solid #444', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.3s ease' }}
                                >
                                    📺 {anime.title} (Current)
                                </button>
                                {seasons.map((season, index) => (
                                    season.entry && season.entry.map((entry, entryIndex) => (
                                        <button
                                            key={`${index}-${entryIndex}`}
                                            onClick={() => setSelectedSeason(entry.anilistId ?? entry.mal_id)}
                                            style={{ padding: '12px 20px', background: selectedSeason === (entry.anilistId ?? entry.mal_id) ? '#ffd700' : '#2a2a2a', color: 'white', border: selectedSeason === (entry.anilistId ?? entry.mal_id) ? '2px solid #ffd700' : '2px solid #444', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.3s ease' }}
                                        >
                                            🎬 {entry.name}
                                        </button>
                                    ))
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px' }}>
                            <h3 style={{ color: '#ffd700', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                                📺 Episodes ({episodes ? episodes.length : 0})
                            </h3>
                            {episodes && episodes.length > 0 && (
                                <span style={{ background: 'linear-gradient(45deg, #ffd700, #ffed4e)', color: 'white', padding: '8px 16px', borderRadius: '25px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)' }}>
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
                                            <div className="episode-info">
                                                <div className="episode-content">
                                                    <h4 className="episode-title">
                                                        {episode.title || `Episode ${episode.mal_id || index + 1}`}
                                                    </h4>
                                                    {episode.synopsis && (
                                                        <p className="episode-synopsis">{episode.synopsis}</p>
                                                    )}
                                                </div>
                                                <div className="episode-footer">
                                                    {episode.aired && (
                                                        <div className="episode-date">
                                                            📅 {new Date(episode.aired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </div>
                                                    )}
                                                    {episode.watchUrl ? (
                                                        <a href={episode.watchUrl} target="_blank" rel="noopener noreferrer" className="watch-button">
                                                            🎬 Watch on {episode.site || 'Crunchyroll'}
                                                        </a>
                                                    ) : (
                                                        <a href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.title + ' episode ' + (episode.mal_id || index + 1))}`}
                                                           target="_blank" rel="noopener noreferrer" className="watch-button">
                                                            🎬 Watch
                                                        </a>
                                                    )}
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
                                    <h4>No Episodes Available</h4>
                                    <p>Episode data is not available for this title on AniList.</p>
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
                        <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                {characters.slice(0, 6).map((char, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255, 215, 0, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                                        <img
                                            src={char.character.images.jpg.image_url}
                                            alt={char.character.name}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
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

                {/* Production Staff — passes staff array from AniList */}
                <ProductionStaff anime={anime} staff={staff} />

                {/* Background */}
                {anime.background && (
                    <div className='content-section'>
                        <h2 className='section-title'>Background</h2>
                        <p className='synopsis-text'>{anime.background}</p>
                    </div>
                )}
            </div>

            {/* Quiz Type Modal */}
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
