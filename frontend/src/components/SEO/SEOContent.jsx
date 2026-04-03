import './SEOContent.css';

export function SEOContent() {
  return (
    <section className="seo-section" aria-label="About RankOtaku">
      <div className="seo-container">
        {/* Hero Section */}
        <div className="seo-hero">
          <h2 className="seo-title">Welcome to RankOtaku</h2>
          <p className="seo-subtitle">The Ultimate Anime Quiz Platform</p>
          <p className="seo-description">
            <strong>RankOtaku</strong> is the premier destination for anime enthusiasts who want to test their{' '}
            <span className="highlight">anime knowledge</span> and compete with fellow otaku worldwide. Our platform offers 
            thousands of <span className="highlight">anime quizzes</span>, <span className="highlight">anime trivia</span>, and challenging{' '}
            <span className="highlight">anime games</span> that cover everything from classic series to the latest releases.
          </p>
        </div>

        {/* Quiz Categories */}
        <div className="quiz-categories">
          <h3 className="categories-title">Test Your <span className="highlight">Anime Knowledge</span></h3>
          <p className="categories-subtitle">
            Whether you're a casual anime watcher or a hardcore otaku, RankOtaku has the perfect{' '}
            <span className="highlight">anime challenge</span> for you.
          </p>
          
          <div className="categories-list">
            <div className="category-item">
              <span className="category-bullet">•</span>
              Popular anime series like Naruto, One Piece, Attack on Titan
            </div>
            <div className="category-item">
              <span className="category-bullet">•</span>
              Classic anime from the 80s, 90s, and 2000s
            </div>
            <div className="category-item">
              <span className="category-bullet">•</span>
              Latest seasonal anime and trending series
            </div>
            <div className="category-item">
              <span className="category-bullet">•</span>
              Anime movies and OVAs
            </div>
            <div className="category-item">
              <span className="category-bullet">•</span>
              Character recognition and voice actor trivia
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}