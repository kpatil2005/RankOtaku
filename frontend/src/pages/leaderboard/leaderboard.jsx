import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './leaderboard.css'

// Move pure function outside component (never changes)
const getEyePower = (points) => {
    if (points >= 1000) return { name: "Rinnegan", image: "/Rinnegan.png" };
    if (points >= 500) return { name: "Mangekyou Sharingan", image: "/Mangekyou.png" };
    if (points >= 300) return { name: "Sharingan (3 Tomoe)", image: "/Sharingan3.png" };
    if (points >= 200) return { name: "Sharingan (2 Tomoe)", image: "/Sharingan2.png" };
    if (points >= 150) return { name: "Sharingan", image: "/Sharingan1.png" };
    if (points >= 50) return { name: "Byakugan", image: "/Byakugan.svg.png" };
    return { name: "Normal Eyes", icon: "-" };
};

// Memoized LeaderItem component
const LeaderItem = React.memo(({ leader, index, onMouseEnter, onMouseLeave, onClick }) => {
    const eyePower = getEyePower(leader.otakuPoints);
    const rank = leader.rank || (index + 1);
    
    return (
        <div 
            className={`leader-item rank-${rank}`}
            onMouseEnter={(e) => onMouseEnter(leader, rank, eyePower, e)}
            onMouseLeave={onMouseLeave}
            onClick={() => onClick(leader._id)}
            style={{ cursor: 'pointer' }}
        >
            <div className='leader-rank'>
                {rank <= 3 ? (
                    <>
                        <span className='rank-number'>{rank}</span>
                        <span className='rank-medal'>🏅</span>
                    </>
                ) : (
                    <span className='rank-number'>{rank}</span>
                )}
            </div>
            
            <div className='leader-name'>{leader.username}</div>
            
            <div className='leader-eye' title={eyePower.name}>
                {eyePower.image ? (
                    <img 
                        src={eyePower.image} 
                        alt={eyePower.name} 
                        className='eye-image'
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <span className='eye-icon'>{eyePower.icon}</span>
                )}
            </div>
            
            <div className='leader-score'>
                {leader.otakuPoints?.toLocaleString() || 0}
            </div>
        </div>
    );
});

LeaderItem.displayName = 'LeaderItem';

export function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [popupState, setPopupState] = useState({
        leader: null,
        position: { top: 0, left: 0 }
    });
    const navigate = useNavigate();

    const handleMouseEnter = React.useCallback((leader, rank, eyePower, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopupState({
            leader: { ...leader, rank, eyePower },
            position: { top: rect.top, left: rect.left - 290 }
        });
    }, []);

    const handleMouseLeave = React.useCallback(() => {
        setPopupState({ leader: null, position: { top: 0, left: 0 } });
    }, []);

    const handleNavigate = React.useCallback((userId) => {
        navigate(`/profile/${userId}`);
    }, [navigate]);

    useEffect(() => {
        const CACHE_KEY = 'leaderboard_data';
        const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (leaderboard changes frequently)
        
        // Check cache first
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    setLeaders(data);
                    setLoading(false);
                    return;
                }
            } catch (error) {
                console.error('Error parsing cache:', error);
                sessionStorage.removeItem(CACHE_KEY);
            }
        }

        const controller = new AbortController();

        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/leaderboard`,
                    { signal: controller.signal }
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch leaderboard');
                }
                
                const data = await response.json();
                setLeaders(data);
                setError(null);
                
                // Cache the data
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching leaderboard:', error);
                    setError('Failed to load leaderboard');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
        
        return () => controller.abort();
    }, []);

    const handleRetry = React.useCallback(() => {
        setLoading(true);
        setError(null);
        sessionStorage.removeItem('leaderboard_data');
        window.location.reload();
    }, []);

    // Memoize popup content
    const popupContent = React.useMemo(() => {
        if (!popupState.leader) return null;
        
        return (
            <div 
                className='leader-popup-external'
                style={{
                    top: `${popupState.position.top}px`,
                    left: `${popupState.position.left}px`
                }}
            >
                <div className='popup-header'>
                    <h4>{popupState.leader.username}</h4>
                    <span className='popup-rank'>Rank #{popupState.leader.rank}</span>
                </div>
                <div className='popup-content'>
                    <div className='popup-item'>
                        <span className='popup-label'>Otaku Points</span>
                        <span className='popup-value'>{popupState.leader.otakuPoints?.toLocaleString() || 0}</span>
                    </div>
                    <div className='popup-item'>
                        <span className='popup-label'>Quizzes Taken</span>
                        <span className='popup-value'>{popupState.leader.quizzesTaken || 0}</span>
                    </div>
                    <div className='popup-item'>
                        <span className='popup-label'>Eye Power</span>
                        <span className='popup-value'>{popupState.leader.eyePower.name}</span>
                    </div>
                    {popupState.leader.email && (
                        <div className='popup-item'>
                            <span className='popup-label'>Email</span>
                            <span className='popup-value popup-email'>{popupState.leader.email}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [popupState]);

    if (loading) {
        return (
            <div className='leaderboard'>
                <div className='leaderboard-header'>
                    <h3>TOP PLAYERS</h3>
                    <span className='live-badge'>LIVE</span>
                </div>
                <div className='leader-list'>
                    <div className='loading'>Loading...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='leaderboard'>
                <div className='leaderboard-header'>
                    <h3>TOP PLAYERS</h3>
                    <span className='live-badge'>LIVE</span>
                </div>
                <div className='leader-list'>
                    <div className='leaderboard-error'>
                        <p>{error}</p>
                        <button onClick={handleRetry} className='retry-btn'>Retry</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className='leaderboard'>
                <div className='leaderboard-header'>
                    <h3>TOP PLAYERS</h3>
                    <span className='live-badge'>LIVE</span>
                </div>
                <div className='leader-list'>
                    {leaders.map((leader, index) => (
                        <LeaderItem
                            key={leader._id}
                            leader={leader}
                            index={index}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onClick={handleNavigate}
                        />
                    ))}
                </div>
            </div>

            {popupContent}
        </>
    );
}
