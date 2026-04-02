import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './FeaturedCarousel.css';

export const FeaturedCarousel = () => {
    const [featured, setFeatured] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const response = await axios.get('https://api.jikan.moe/v4/top/anime?limit=5');
                setFeatured(response.data.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching featured anime:', error);
                setLoading(false);
            }
        };

        fetchFeatured();
    }, []);

    useEffect(() => {
        if (featured.length === 0) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featured.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [featured.length]);

    const handleStartQuiz = (anime) => {
        const slug = anime.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            + '-' + anime.mal_id;
        navigate(`/anime/${slug}`);
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
    };

    if (loading || featured.length === 0) return null;

    const currentAnime = featured[currentIndex];

    return (
        <div className="featured-carousel">
            <div className="featured-content">
                <div 
                    className="featured-background"
                    style={{
                        backgroundImage: `url(${currentAnime.images.jpg.large_image_url})`
                    }}
                />
                <div className="featured-overlay" />
                
                <div className="featured-info">
                    <div className="featured-badge">FEATURED QUIZ</div>
                    <h2 className="featured-title">{currentAnime.title}</h2>
                    <div className="featured-meta">
                        <span className="meta-item">⭐ {currentAnime.score}</span>
                        <span className="meta-item">📺 {currentAnime.type}</span>
                        <span className="meta-item">🏆 Rank #{currentAnime.rank}</span>
                    </div>
                    <p className="featured-synopsis">
                        {currentAnime.synopsis?.slice(0, 150)}...
                    </p>
                    <button 
                        className="featured-cta"
                        onClick={() => handleStartQuiz(currentAnime)}
                    >
                        Start Quiz Now
                    </button>
                </div>

                <div className="featured-poster">
                    <img 
                        src={currentAnime.images.jpg.large_image_url} 
                        alt={currentAnime.title}
                    />
                </div>
            </div>

            <div className="carousel-dots">
                {featured.map((_, index) => (
                    <button
                        key={index}
                        className={`dot ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => goToSlide(index)}
                    />
                ))}
            </div>
        </div>
    );
};
