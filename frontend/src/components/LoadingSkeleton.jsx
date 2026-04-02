import React from 'react';
import './LoadingSkeleton.css';

export const AnimeCardSkeleton = () => {
    return (
        <div className="anime-card-skeleton">
            <div className="skeleton-image"></div>
            <div className="skeleton-info">
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text short"></div>
                <div className="skeleton-text short"></div>
            </div>
        </div>
    );
};

export const AnimeGridSkeleton = ({ count = 6 }) => {
    return (
        <div className="anime-skeleton-grid">
            {Array.from({ length: count }).map((_, index) => (
                <AnimeCardSkeleton key={index} />
            ))}
        </div>
    );
};

export const LeaderboardSkeleton = () => {
    return (
        <div className="leaderboard-skeleton">
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="leaderboard-item-skeleton">
                    <div className="skeleton-rank"></div>
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-name"></div>
                    <div className="skeleton-points"></div>
                </div>
            ))}
        </div>
    );
};

export const ProfileSkeleton = () => {
    return (
        <div className="profile-skeleton">
            <div className="skeleton-avatar-large"></div>
            <div className="skeleton-profile-info">
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
            </div>
            <div className="skeleton-stats-grid">
                <div className="skeleton-stat-card"></div>
                <div className="skeleton-stat-card"></div>
                <div className="skeleton-stat-card"></div>
                <div className="skeleton-stat-card"></div>
            </div>
        </div>
    );
};
