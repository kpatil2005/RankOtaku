import React, { useState, useEffect } from 'react'
import './Herosection.css';
import { Leaderboard } from '../leaderboard/leaderboard';
import { HeroContent } from './HeroContent';
import { AnimeBackground } from './AnimeBackground';

export function Herosection() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(false);

    // Use local WebP images from public folder
    const animeList = Array.from({ length: 10 }, (_, index) => ({
        image: `/${index + 1}.webp`,
    }));

    useEffect(() => {
        if (animeList.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % animeList.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [animeList]);

    return (
        <div className='hero'>
            <AnimeBackground animeList={animeList} currentSlide={currentSlide} />
            <div className='hero-main'>
                <HeroContent />
                <Leaderboard loading={loading} />
            </div>
        </div>
    );
}