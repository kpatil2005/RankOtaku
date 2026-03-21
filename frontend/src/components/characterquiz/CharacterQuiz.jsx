import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../header/Header';
import axios from 'axios';
import '../../pages/quiz/QuizPage.css';

export function CharacterQuiz() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const { character, animeTitle, animeImage, animeId, completedCharacters } = location.state || {};
    
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showScore, setShowScore] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [userAnswers, setUserAnswers] = useState([]);
    const [pointsEarned, setPointsEarned] = useState(0);

    useEffect(() => {
        if (!character) {
            navigate(-1);
            return;
        }

        const generateCharacterQuiz = async () => {
            setLoading(true);
            try {
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/generate-character-quiz`, {
                    characterName: character.name,
                    animeTitle: animeTitle
                });
                
                console.log('=== CHARACTER QUIZ GENERATED ===');
                console.log('Character:', character.name);
                console.log('Anime:', animeTitle);
                console.log('\nQuestions and Answers:');
                console.log('========================');
                
                response.data.quiz.forEach((q, index) => {
                    console.log(`\nQuestion ${index + 1}:`, q.question);
                    console.log('Options:', q.options);
                    console.log('✓ Correct Answer:', q.answer);
                    console.log('------------------------');
                });
                
                console.log('\n=== END OF QUIZ ===\n');
                
                setQuiz(response.data.quiz);
            } catch (error) {
                console.error('Error generating character quiz:', error);
                alert('Failed to generate character quiz. Please try again.');
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };

        generateCharacterQuiz();
    }, [character, animeTitle, navigate]);

    const handleAnswer = (selectedOption) => {
        if (selectedAnswer) return;
        setSelectedAnswer(selectedOption);
    };

    const handleNext = async () => {
        const newAnswers = [...userAnswers, selectedAnswer];
        setUserAnswers(newAnswers);
        
        if (selectedAnswer === quiz[currentQuestion].answer) {
            setScore(score + 1);
        }

        const nextQuestion = currentQuestion + 1;
        if (nextQuestion < quiz.length) {
            setCurrentQuestion(nextQuestion);
            setSelectedAnswer(null);
        } else {
            // Submit quiz to backend
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/submit-quiz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        answers: newAnswers, 
                        quiz, 
                        animeTitle: `${animeTitle} - ${character.name}`,
                        animeImage: character.images.jpg.image_url
                    })
                });
                const data = await response.json();
                if (data.user) {
                    setUser(data.user);
                    setPointsEarned(data.points);
                }
            } catch (error) {
                console.error('Error submitting quiz:', error);
            }

            // Mark character as completed
            const completed = [...completedCharacters, character.mal_id];
            localStorage.setItem(`completed_characters_${animeId}`, JSON.stringify(completed));

            setShowScore(true);
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <div className="quiz-page">
                    <div className="quiz-card">
                        <h2>Generating Character Quiz...</h2>
                    </div>
                </div>
            </>
        );
    }

    if (!quiz) {
        return null;
    }

    return (
        <>
            <Header />
            <div className="quiz-page" style={animeImage ? { backgroundImage: `url(${animeImage})` } : {}}>
                <div className="quiz-card">
                    {showScore ? (
                        <div className="result-container">
                            <img src="/nizuko.gif" alt="Nezuko" className="result-gif" />
                            <div className="result-content">
                                <div className="result-badge">Quiz Complete!</div>
                                <h2 className="result-anime-title">{character.name}</h2>
                                <div className="result-score-card">
                                    <div className="score-number">{score}/{quiz.length}</div>
                                    <div className="score-label">Correct Answers</div>
                                    {pointsEarned > 0 && (
                                        <div className="points-earned">+{pointsEarned} Otaku Points!</div>
                                    )}
                                </div>
                                <button className="back-btn" onClick={() => navigate(-2)}>
                                    Return to Anime Details
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button className="surrender-btn-left" onClick={() => navigate(-1)}>
                                Surrender Battle
                            </button>
                            <div className="question-header">
                                Question {currentQuestion + 1} of {quiz.length}
                            </div>
                            <h2 className="quiz-title">{character.name} Quiz</h2>
                            <div className="question-text">{quiz[currentQuestion].question}</div>
                            <div className="options-grid">
                                {quiz[currentQuestion].options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswer(option)}
                                        className={`option-btn ${selectedAnswer === option ? 'active' : ''}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="submit-btn"
                                onClick={handleNext}
                                disabled={!selectedAnswer}
                            >
                                {currentQuestion === quiz.length - 1 ? 'Finish' : 'Next Question'}
                            </button>
                        </>
                    )}
                </div>

                {!showScore && (
                    <div className="quiz-stats">
                        <div className="stats-header">
                            <h3>Battle Stats</h3>
                        </div>

                        <div className="stat-item">
                            <span className="stat-label">Score</span>
                            <span className="stat-value">{score}/{currentQuestion}</span>
                        </div>

                        <div className="stat-item">
                            <span className="stat-label">Accuracy</span>
                            <span className="stat-value">
                                {currentQuestion > 0 ? Math.round((score / currentQuestion) * 100) : 0}%
                            </span>
                        </div>

                        <div className="progress-section">
                            <div className="stat-label">Progress</div>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
                                />
                            </div>
                            <div className="progress-text">{currentQuestion + 1} / {quiz.length}</div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
