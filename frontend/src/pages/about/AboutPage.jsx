import React from 'react';
import { Header } from '../../components/header/Header';
import { Footer } from '../../components/footer/Footer';
import { SEOHead } from '../../components/SEO/SEOHead';
import './AboutPage.css';

export function AboutPage() {
    return (
        <>
            <SEOHead
                title="About RankOtaku | The Ultimate Anime Quiz Platform"
                description="Learn about RankOtaku, the premier platform for anime fans to test their knowledge, climb the global leaderboards, and unlock exclusive visual achievements."
                keywords="about rankotaku, anime quiz platform, otaku leaderboard, kalpesh patil anime, anime knowledge test"
            />
            <Header />
            <div className="about-page">
                {/* Hero Section */}
                <div className="about-hero">
                    <div className="about-hero-content">
                        <h1>Discover <span className="highlight">RankOtaku</span></h1>
                        <p>The ultimate proving ground for anime fans worldwide. Test your knowledge, climb the ranks, and awaken your true visual prowess.</p>
                    </div>
                    <div className="about-hero-background"></div>
                </div>

                {/* Main Content Container */}
                <div className="about-container">
                    
                    {/* Mission Section */}
                    <section className="about-section fade-in">
                        <div className="section-header">
                            <span className="section-icon">🎌</span>
                            <h2>Our Mission</h2>
                        </div>
                        <p className="section-text">
                            RankOtaku was born out of a pure passion for anime and a desire to create a definitive platform where fans could truly quantify their knowledge. We noticed that while there are countless places to track what you've watched, there was no premier arena to test <strong>how well you paid attention</strong>.
                        </p>
                        <p className="section-text">
                            Our mission is to challenge the global anime community with high-quality, dynamically generated trivia across over 10,000+ anime series and characters, transforming casual watching into a competitive, rewarding experience.
                        </p>
                    </section>

                    {/* Features Grid */}
                    <section className="about-section fade-in">
                        <div className="section-header">
                            <span className="section-icon">⚡</span>
                            <h2>The RankOtaku Experience</h2>
                        </div>
                        <div className="features-grid">
                            <div className="feature-card">
                                <div className="feature-icon">🎮</div>
                                <h3>Dynamic Quizzes</h3>
                                <p>Endless AI-generated trivia specific to the anime series and characters you claim to know best.</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">👁️</div>
                                <h3>Visual Awakenings</h3>
                                <p>Progress through iconic visual ranks. Start with Normal Eyes, unlock the Sharingan, and evolve all the way to the Rinnegan.</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">🏅</div>
                                <h3>Global Leaderboard</h3>
                                <p>Earn Otaku Points with every correct answer and climb the live global ranking to cement your legacy as an Otaku Legend.</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">👤</div>
                                <h3>Premium Profiles</h3>
                                <p>Showcase your Anime List, Character Mastery unlocks, detailed statistics, and recent activity in a sleek, beautifully designed dashboard.</p>
                            </div>
                        </div>
                    </section>

                    {/* Developer Section */}
                    <section className="about-section developer-section fade-in">
                        <div className="section-header center">
                            <span className="section-icon">👨‍💻</span>
                            <h2>Meet the Developer</h2>
                        </div>
                        <div className="developer-profile">
                            <div className="dev-avatar">
                                <img src="https://github.com/kpatil2005.png" alt="Kalpesh Patil" onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://ui-avatars.com/api/?name=Kalpesh+Patil&background=ff6b35&color=fff&size=200';
                                }} />
                            </div>
                            <div className="dev-info">
                                <h3>Kalpesh Patil</h3>
                                <h4 className="dev-subtitle">Creator & Lead Developer</h4>
                                <p className="dev-bio">
                                    I built RankOtaku to push the boundaries of what an anime fan site could look and feel like. By blending modern web technologies, AI integration, and cutting-edge, minimalist UI/UX design, I wanted to create an experience that feels truly premium. I'm always looking to innovate and add massive new features to the platform.
                                </p>
                                <div className="dev-socials">
                                    <a href="https://portfolio-lemon-alpha-13.vercel.app" target="_blank" rel="noopener noreferrer" className="social-btn">
                                        🌐 Portfolio
                                    </a>
                                    <a href="https://linkedin.com/in/kalpesh-patil-2a30a9290" target="_blank" rel="noopener noreferrer" className="social-btn linkedin">
                                        💼 LinkedIn
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Tech Stack & Acknowledgments Section */}
                    <section className="about-section fade-in">
                        <div className="section-header">
                            <span className="section-icon">⚙️</span>
                            <h2>Technology & Acknowledgments</h2>
                        </div>
                        <div className="tech-stack-container">
                            <span className="tech-badge">React.js</span>
                            <span className="tech-badge">Node.js</span>
                            <span className="tech-badge">Express.js</span>
                            <span className="tech-badge">MongoDB</span>
                            <span className="tech-badge">Groq AI</span>
                            <span className="tech-badge">Jikan API</span>
                            <span className="tech-badge">Vite</span>
                        </div>

                        <div className="acknowledgments-box">
                            <div className="ack-header">
                                <span className="ack-icon">🙏</span>
                                <h3>Special Thanks to Jikan API</h3>
                            </div>
                            <p>
                                A massive and heartfelt thank you to the open-source <strong>Jikan API</strong> project. 
                                RankOtaku wouldn't exist without it. By providing exceptionally fast, reliable, and comprehensive access to the MyAnimeList database, Jikan serves as the core foundational backbone of our entire anime catalog. 
                            </p>
                            <p>
                                We are deeply grateful to the Jikan developers and the MyAnimeList community for their tireless work in making the world's anime data accessible to developers everywhere.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </>
    );
}
