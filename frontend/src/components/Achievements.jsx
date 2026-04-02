import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Achievements.css';

export const Achievements = () => {
    const { user } = useAuth();

    const achievements = [
        {
            id: 1,
            name: 'Byakugan',
            description: 'Complete your first quiz',
            icon: '👁️',
            requirement: 10,
            color: '#a8dadc'
        },
        {
            id: 2,
            name: 'Sharingan (1 Tomoe)',
            description: 'Earn 50 Otaku Points',
            icon: '🔴',
            requirement: 50,
            color: '#e63946'
        },
        {
            id: 3,
            name: 'Sharingan (2 Tomoe)',
            description: 'Earn 200 Otaku Points',
            icon: '🔴🔴',
            requirement: 200,
            color: '#d62828'
        },
        {
            id: 4,
            name: 'Sharingan (3 Tomoe)',
            description: 'Earn 500 Otaku Points',
            icon: '🔴🔴🔴',
            requirement: 500,
            color: '#c1121f'
        },
        {
            id: 5,
            name: 'Mangekyou Sharingan',
            description: 'Earn 1000 Otaku Points',
            icon: '⭐',
            requirement: 1000,
            color: '#780000'
        },
        {
            id: 6,
            name: 'Rinnegan',
            description: 'Earn 2000 Otaku Points',
            icon: '🌀',
            requirement: 2000,
            color: '#9d4edd'
        }
    ];

    const userPoints = user?.otakuPoints || 0;

    const getProgress = (requirement) => {
        return Math.min((userPoints / requirement) * 100, 100);
    };

    const isUnlocked = (requirement) => {
        return userPoints >= requirement;
    };

    return (
        <div className="achievements-section">
            <div className="achievements-header">
                <h2>Unlock Eye Powers</h2>
                <p>Earn Otaku Points to unlock legendary abilities</p>
            </div>

            <div className="achievements-grid">
                {achievements.map((achievement) => {
                    const unlocked = isUnlocked(achievement.requirement);
                    const progress = getProgress(achievement.requirement);

                    return (
                        <div 
                            key={achievement.id}
                            className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
                            style={{
                                '--achievement-color': achievement.color
                            }}
                        >
                            <div className="achievement-icon">
                                {achievement.icon}
                            </div>
                            <div className="achievement-info">
                                <h3>{achievement.name}</h3>
                                <p>{achievement.description}</p>
                                <div className="achievement-progress">
                                    <div 
                                        className="progress-bar"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="achievement-status">
                                    {unlocked ? (
                                        <span className="status-unlocked">✓ Unlocked</span>
                                    ) : (
                                        <span className="status-locked">
                                            {userPoints}/{achievement.requirement} Points
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
