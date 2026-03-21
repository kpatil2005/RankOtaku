import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/header/Header'
import './QuizPage.css'

export function QuizPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const { quiz, animeTitle, animeImage, characters } = location.state || {};
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showScore, setShowScore] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showIntro, setShowIntro] = useState(true);
    const [userAnswers, setUserAnswers] = useState([]);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [randomChars] = useState(() => {
        if (!characters || characters.length < 2) return [0, 1];
        const indices = [];
        while (indices.length < 2) {
            const rand = Math.floor(Math.random() * Math.min(characters.length, 10));
            if (!indices.includes(rand)) indices.push(rand);
        }
        return indices;
    });

    React.useEffect(() => {
        const timer = setTimeout(() => setShowIntro(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    if (!quiz) {
        return <div className="quiz-error">No quiz available</div>;
    }

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
                    body: JSON.stringify({ answers: newAnswers, quiz, animeTitle, animeImage })
                });
                const data = await response.json();
                if (data.user) {
                    setUser(data.user);
                    setPointsEarned(data.points);
                }
            } catch (error) {
                console.error('Error submitting quiz:', error);
            }
            setShowScore(true);
        }
    };

    return (
        <>
            <Header />
            {showIntro ? (
                <div className="vs-container">
                    <div className="vs-left">
                        <img src={characters?.[randomChars[0]]?.character?.images?.jpg?.image_url || animeImage} alt="Character 1" className="fighter-img" />
                        <h2 className="fighter-name">{characters?.[randomChars[0]]?.character?.name || 'Fighter 1'}</h2>
                    </div>
                    <div className="vs-text">VS</div>
                    <div className="vs-right">
                        <img src={characters?.[randomChars[1]]?.character?.images?.jpg?.image_url || animeImage} alt="Character 2" className="fighter-img" />
                        <h2 className="fighter-name">{characters?.[randomChars[1]]?.character?.name || 'Fighter 2'}</h2>
                    </div>
                </div>
            ) : (
                <div className="quiz-page" style={animeImage ? { backgroundImage: `url(${animeImage})` } : {}}>
                    <>
                        <div className="quiz-card">
                                {showScore ? (
                                    <div className="result-container">
                                        <img src="/nizuko.gif" alt="Nezuko" className="result-gif" />
                                        <div className="result-content">
                                            <div className="result-badge">Quiz Complete!</div>
                                            <h2 className="result-anime-title">{animeTitle}</h2>
                                            <div className="result-score-card">
                                                <div className="score-number">{score}/{quiz.length}</div>
                                                <div className="score-label">Correct Answers</div>
                                                {pointsEarned > 0 && (
                                                    <div className="points-earned">+{pointsEarned} Otaku Points!</div>
                                                )}
                                            </div>
                                            <button className="back-btn" onClick={() => navigate(-1, { state: { fromQuiz: true } })}>
                                                Return to Battle Selection
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
                                        <h2 className="quiz-title">{animeTitle}</h2>
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
                        </>
                </div>
            )}
        </>
    );
}
