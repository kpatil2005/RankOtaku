export function HeroContent() {
    const handleStartQuiz = () => {
        navigate('/character-selection');
    };

    const handleExploreAnime = () => {
        navigate('/anime');
    };
    return (
        <div className='hero-content'>
            <h1>PROVE YOU'RE A TRUE ANIME FAN</h1>
            <p>Test your knowledge across 10,000+ anime quizzes and climb the global leaderboard</p>
            <div className='hero-buttons'>
                <button className='btn-primary' onClick={handleStartQuiz}>
                    START QUIZ
                </button>
                <button className='btn-secondary' onClick={handleExploreAnime}>
                    EXPLORE ANIME
                </button>
            </div>
            <div className='hero-stats'>
                <div className='stat-item'>
                    <span className='stat-number'>10,000+</span>
                    <span className='stat-label'>Quizzes</span>
                </div>
                <div className='stat-item'>
                    <span className='stat-number'>50,000+</span>
                    <span className='stat-label'>Players</span>
                </div>
                <div className='stat-item'>
                    <span className='stat-number'>1M+</span>
                    <span className='stat-label'>Questions</span>
                </div>
            </div>
        </div>
    )
}