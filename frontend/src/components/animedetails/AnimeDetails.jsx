import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './AnimeDetails.css'
import { Header } from '../header/Header';
import { DoorTransition } from '../doortransition/DoorTransition';
import { useAddToList, useIsAnimeInList } from '../../hooks/useAnimeQueries';
import { usePageMeta } from '../../hooks/usePageMeta';

export function AnimeDetails() {
    const { slug } = useParams()
    const id = slug.split('-').pop()
    const navigate = useNavigate()
    const [anime, setAnime] = useState(null)
    const [pictures, setPictures] = useState([])
    const [characters, setCharacters] = useState([])
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
        setShowDoor(!fromQuiz);
        
        // Load completed characters from localStorage
        const completed = JSON.parse(localStorage.getItem(`completed_characters_${id}`) || '[]');
        setCompletedCharacters(completed);
        
        axios.get(`https://api.jikan.moe/v4/anime/${id}`)
            .then(res => {
                setAnime(res.data.data)
            })
        
        axios.get(`https://api.jikan.moe/v4/anime/${id}/pictures`)
            .then(res => {
                setPictures(res.data.data)
            })
        
        axios.get(`https://api.jikan.moe/v4/anime/${id}/characters`)
            .then(res => {
                setCharacters(res.data.data)
            })
            
    }, [id])

    if (!anime) return null

    return(
        <>
          {showDoor && <DoorTransition onComplete={() => setShowDoor(false)} />}
          <div className='anime-details-container'>
            {/* Hero Banner */}
            <div className='anime-hero' style={{backgroundImage: `url(${anime.images.jpg.large_image_url})`}}>
                <Header/>
                <div className='anime-hero-content'>
                    <img src={anime.images.jpg.large_image_url} alt={anime.title} className='anime-poster' />
                    <div className='anime-hero-info'>
                        <h1>{anime.title}</h1>
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
                                disabled={isInList || addToListMutation.isPending}
                            >
                                {isInList ? '✓ In My List' : addToListMutation.isPending ? 'Adding...' : 'Add to My List'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Synopsis */}
            <div className='content-section'>
                <h1>{anime.title} Quiz - Test Your Knowledge</h1>
                <p>
                    Play {anime.title} quiz and test your knowledge about characters, story, and battles. 
                    Challenge yourself with questions about {anime.title} and compete with other fans on the leaderboard.
                </p>
                <h2 className='section-title'>About {anime.title}</h2>
                <p className='synopsis-text'>{anime.synopsis}</p>
            </div>

            {/* Info Grid */}
            <div className='content-section'>
                <h2 className='section-title'>Information</h2>
                <div className='info-grid'>
                    <div className='info-item'>
                        <span className='info-label'>English</span>
                        <span className='info-value'>{anime.title_english || 'N/A'}</span>
                    </div>
                    <div className='info-item'>
                        <span className='info-label'>Japanese</span>
                        <span className='info-value'>{anime.title_japanese}</span>
                    </div>
                    <div className='info-item'>
                        <span className='info-label'>Aired</span>
                        <span className='info-value'>{anime.aired.string}</span>
                    </div>
                    <div className='info-item'>
                        <span className='info-label'>Duration</span>
                        <span className='info-value'>{anime.duration}</span>
                    </div>
                    <div className='info-item'>
                        <span className='info-label'>Rating</span>
                        <span className='info-value'>{anime.rating}</span>
                    </div>
                    <div className='info-item'>
                        <span className='info-label'>Studios</span>
                        <span className='info-value'>{anime.studios.map(s => s.name).join(', ') || 'N/A'}</span>
                    </div>
                    <div className='info-item'>
                        <span className='info-label'>Members</span>
                        <span className='info-value'>{anime.members?.toLocaleString()}</span>
                    </div>
                    <div className='info-item'>
                        <span className='info-label'>Favorites</span>
                        <span className='info-value'>{anime.favorites?.toLocaleString()}</span>
                    </div>
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

            {/* Gallery */}
            {pictures.length > 0 && (
                <div className='content-section'>
                    <h2 className='section-title'>Gallery</h2>
                    <div className='gallery-grid'>
                        {pictures.map((pic, index) => (
                            <img key={index} src={pic.jpg.image_url} alt={`${anime.title} ${index + 1}`} className='gallery-image' />
                        ))}
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
