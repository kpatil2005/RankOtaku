import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RecentActivity.css';

export const RecentActivity = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentActivities();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchRecentActivities, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchRecentActivities = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/recent-activities`);
            setActivities(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching activities:', error);
            setLoading(false);
        }
    };

    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - activityTime) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const getScoreColor = (score) => {
        if (score >= 90) return '#4ade80';
        if (score >= 70) return '#fbbf24';
        if (score >= 50) return '#fb923c';
        return '#ef4444';
    };

    if (loading) {
        return (
            <div className="recent-activity">
                <div className="activity-header">
                    <h3>Recent Quiz Activity</h3>
                    <span className="live-indicator">
                        <span className="pulse"></span>
                        LIVE
                    </span>
                </div>
                <div className="activity-loading">Loading activities...</div>
            </div>
        );
    }

    return (
        <div className="recent-activity">
            <div className="activity-header">
                <h3>Recent Quiz Activity</h3>
                <span className="live-indicator">
                    <span className="pulse"></span>
                    LIVE
                </span>
            </div>

            <div className="activity-list">
                {activities.length === 0 ? (
                    <div className="no-activity">
                        <p>No recent activity. Be the first to complete a quiz!</p>
                    </div>
                ) : (
                    activities.map((activity, index) => (
                        <div key={index} className="activity-item">
                            <div className="activity-avatar">
                                {activity.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="activity-content">
                                <div className="activity-text">
                                    <span className="activity-user">{activity.username}</span>
                                    {' '}completed{' '}
                                    <span className="activity-quiz">{activity.quizTitle}</span>
                                </div>
                                <div className="activity-meta">
                                    <span 
                                        className="activity-score"
                                        style={{ color: getScoreColor(activity.score) }}
                                    >
                                        {activity.score}% Score
                                    </span>
                                    <span className="activity-time">
                                        {getTimeAgo(activity.timestamp)}
                                    </span>
                                </div>
                            </div>
                            {activity.score >= 90 && (
                                <div className="activity-badge">🏆</div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
