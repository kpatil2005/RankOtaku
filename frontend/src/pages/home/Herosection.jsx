import React, { useState, useEffect } from 'react'
import './Herosection.css';
import { Leaderboard } from '../leaderboard/leaderboard';
import { HeroContent } from './HeroContent';
import { AnimeBackground } from './AnimeBackground';
import { HeroLoading } from './HeroLoading';
export function Herosection() {
    const [animeList, setAnimeList] = useState([]);
    const [loading, setLoading] = useState(() => {
        return !sessionStorage.getItem('heroLoaded');
    });
    const [currentSlide, setCurrentSlide] = useState(0);
    useEffect(() => {
        const fetchPopularAnime = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/home`);
                const data = await response.json();

                if (data.data) {
                    const popularAnime = data.data.slice(0, 10).map((anime, index) => {
                        return {
                            image: `/${index + 1}.jpg`,
                        };
                    });
                    setAnimeList(popularAnime);
                }
                setLoading(false);
                sessionStorage.setItem('heroLoaded', 'true');
            } catch (error) {
                console.error('Error fetching anime:', error);
                const fallbackAnime = Array.from({ length: 10 }, (_, index) => ({
                    image: `/${index + 1}.jpg`,
                }));
                setAnimeList(fallbackAnime);
                setLoading(false);
                sessionStorage.setItem('heroLoaded', 'true');
            }
        };
        fetchPopularAnime();
    }, []);
    useEffect(() => {
        if (animeList.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % animeList.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [animeList]);
    if (loading) {
        return (
            <div className='hero'>
                <HeroLoading />
            </div>
        );
    }
    return (
        <div className='hero'>
            <AnimeBackground animeList={animeList} currentSlide={currentSlide} />
            <div className='hero-main'>
                <HeroContent />
                <Leaderboard />
            </div>
        </div>
    );
}