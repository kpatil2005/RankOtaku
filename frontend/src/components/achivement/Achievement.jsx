import React from 'react';
import './Achievement.css';

export function Achievement() {
    return (
        <div className="achievement-container">
            <h1 className="achievement-title">Achievements</h1>
            
            <div className="achievement-sections">
                <div className="achievement-section anime-section">
                    <h2 className="section-title">
                        Anime Achievements <span className="section-description">- View your anime collection milestones</span>
                    </h2>
                    <div className="achievement-grid">
                        <div className="achievement-card">
                            <div className="achievement-icon">🏆</div>
                            <h3>Anime Master</h3>
                            <p>Complete 10 anime quizzes</p>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{width: '70%'}}></div>
                            </div>
                            <span className="progress-text">7/10</span>
                        </div>
                        
                        <div className="achievement-card">
                            <div className="achievement-icon">⭐</div>
                            <h3>Perfect Score</h3>
                            <p>Get 100% on any quiz</p>
                            <div className="achievement-status unlocked">Unlocked!</div>
                        </div>
                        
                        <div className="achievement-card">
                            <div className="achievement-icon">🔥</div>
                            <h3>Quiz Streak</h3>
                            <p>Complete 5 quizzes in a row</p>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{width: '40%'}}></div>
                            </div>
                            <span className="progress-text">2/5</span>
                        </div>
                    </div>
                </div>
                
                <div className="achievement-section characters-section">
                    <h2 className="section-title">
                        Character Achievements <span className="section-description">- View your character knowledge achievements</span>
                    </h2>
                    <div className="achievement-grid">
                        <div className="achievement-card">
                            <div className="achievement-icon">👥</div>
                            <h3>Character Expert</h3>
                            <p>Identify 50 different characters</p>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{width: '60%'}}></div>
                            </div>
                            <span className="progress-text">30/50</span>
                        </div>
                        
                        <div className="achievement-card">
                            <div className="achievement-icon">💪</div>
                            <h3>Main Character</h3>
                            <p>Answer 20 protagonist questions correctly</p>
                            <div className="achievement-status unlocked">Unlocked!</div>
                        </div>
                        
                        <div className="achievement-card">
                            <div className="achievement-icon">🎭</div>
                            <h3>Villain Specialist</h3>
                            <p>Master villain-related questions</p>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{width: '80%'}}></div>
                            </div>
                            <span className="progress-text">8/10</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
