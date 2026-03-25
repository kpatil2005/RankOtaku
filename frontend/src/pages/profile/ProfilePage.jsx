import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import { Header } from "../../components/header/Header";
import { MyAnimeList } from "../../components/myanimelist/MyAnimeList";
import "./ProfilePage.css";
import "../../components/header/header.css";

export default function ProfilePage() {
    const { user, logout, setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [profileUser, setProfileUser] = useState(null);
    const [quizHistory, setQuizHistory] = useState([]);
    const [globalRank, setGlobalRank] = useState(null);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [activeSection, setActiveSection] = useState('favorites');
    const [loading, setLoading] = useState(true);
    const isOwnProfile = !userId || (user && userId === user._id);

    // Check URL parameters and location state to set active section
    useEffect(() => {
        const section = searchParams.get('section');
        const stateSection = location.state?.section;
        
        if (stateSection && ['statistics', 'achievements', 'recent', 'leaderboard', 'favorites', 'anime-achievements', 'character-achievements'].includes(stateSection)) {
            setActiveSection(stateSection);
        } else if (section && ['statistics', 'achievements', 'recent', 'leaderboard', 'favorites', 'anime-achievements', 'character-achievements'].includes(section)) {
            setActiveSection(section);
            setSearchParams({});
        }
    }, [searchParams, setSearchParams, location.state]);

    // Handle section change from sidebar
    const handleSectionChange = (section) => {
        setActiveSection(section);
        // Clear any URL parameters
        setSearchParams({});
    };

    const getRank = (points) => {
        if (points >= 1000) return "Otaku Legend";
        if (points >= 500) return "Anime Sensei";
        if (points >= 300) return "Elite Otaku";
        if (points >= 150) return "Anime Explorer";
        if (points >= 50) return "Casual Fan";
        return "Beginner Otaku";
    };

    const getEyePower = (points) => {
        if (points >= 1000) return { name: "Rinnegan", image: "/Rinnegan.png", color: "#9333ea", glow: "rgba(147, 51, 234, 0.5)", hasImage: true };
        if (points >= 500) return { name: "Mangekyou Sharingan", image: "/Mangekyou.png", color: "#dc2626", glow: "rgba(220, 38, 38, 0.5)", hasImage: true };
        if (points >= 300) return { name: "Sharingan (3 Tomoe)", image: "/Sharingan3.png", color: "#dc2626", glow: "rgba(220, 38, 38, 0.4)", hasImage: true };
        if (points >= 200) return { name: "Sharingan (2 Tomoe)", image: "/Sharingan2.png", color: "#dc2626", glow: "rgba(220, 38, 38, 0.35)", hasImage: true };
        if (points >= 150) return { name: "Sharingan", image: "/Sharingan1.png", color: "#dc2626", glow: "rgba(220, 38, 38, 0.3)", hasImage: true };
        if (points >= 50) return { name: "Byakugan", image: "/Byakugan.svg.png", color: "#e5e7eb", glow: "rgba(229, 231, 235, 0.5)", hasImage: true };
        return { name: "Normal Eyes", icon: "-", color: "#6b7280", glow: "rgba(107, 114, 128, 0.3)", hasImage: false };
    };

    const getAllUnlockedEyes = (points) => {
        const eyes = [];
        if (points >= 50) eyes.push({ name: "Byakugan", image: "/Byakugan.svg.png", color: "#e5e7eb", hasImage: true });
        if (points >= 150) eyes.push({ name: "Sharingan", image: "/Sharingan1.png", color: "#dc2626", hasImage: true });
        if (points >= 200) eyes.push({ name: "Sharingan (2 Tomoe)", image: "/Sharingan2.png", color: "#dc2626", hasImage: true });
        if (points >= 300) eyes.push({ name: "Sharingan (3 Tomoe)", image: "/Sharingan3.png", color: "#dc2626", hasImage: true });
        if (points >= 500) eyes.push({ name: "Mangekyou Sharingan", image: "/Mangekyou.png", color: "#dc2626", hasImage: true });
        if (points >= 1000) eyes.push({ name: "Rinnegan", image: "/Rinnegan.png", color: "#9333ea", hasImage: true });
        
        // Only show dash if no eyes are unlocked
        if (eyes.length === 0) {
            eyes.push({ name: "Normal Eyes", icon: "-", color: "#6b7280", hasImage: false });
        }
        
        return eyes;
    };

    const getNextRank = (points) => {
        if (points >= 1000) return { name: "Max Rank", target: 1000 };
        if (points >= 500) return { name: "Otaku Legend", target: 1000 };
        if (points >= 300) return { name: "Anime Sensei", target: 500 };
        if (points >= 150) return { name: "Elite Otaku", target: 300 };
        if (points >= 50) return { name: "Anime Explorer", target: 150 };
        return { name: "Casual Fan", target: 50 };
    };

    const getCurrentRankMin = (points) => {
        if (points >= 1000) return 1000;
        if (points >= 500) return 500;
        if (points >= 300) return 300;
        if (points >= 150) return 150;
        if (points >= 50) return 50;
        return 0;
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = {
            username: e.target.username.value,
            bio: e.target.bio.value
        };
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/update-profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.user) {
                setUser(data.user);
                setProfileUser(data.user);
                setShowEditModal(false);
                alert('Profile updated successfully!');
            } else {
                alert(data.error || 'Failed to update profile');
            }
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (isOwnProfile) {
                if (!user) {
                    navigate('/auth');
                    return;
                }
                setProfileUser(user);
                setLoading(false);
            } else {
                // Viewing another user's profile
                try {
                    console.log('Fetching user profile for ID:', userId);
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/user/${userId}`);
                    console.log('Response status:', response.status);
                    const data = await response.json();
                    console.log('Response data:', data);
                    
                    if (response.ok && data.user) {
                        setProfileUser(data.user);
                        setGlobalRank(data.rank);
                    } else {
                        console.error('User not found or error:', data.error);
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                }
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, [userId, user, isOwnProfile, navigate]);

    useEffect(() => {
        const fetchQuizHistory = async () => {
            if (!isOwnProfile) return;
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/quiz-history`, {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setQuizHistory(data.quizHistory || []);
            } catch (error) {
                console.error('Error fetching quiz history:', error);
            }
        };
        const fetchRank = async () => {
            if (!isOwnProfile) return;
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/rank?t=${Date.now()}`, {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) return;
                const data = await response.json();
                setGlobalRank(data.rank);
            } catch (error) {
                console.error('Error fetching rank:', error);
            }
        };
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leaderboard?t=${Date.now()}`, {
                    credentials: 'include'
                });
                if (!response.ok) return;
                const data = await response.json();
                setLeaderboardData(data || []);
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            }
        };
        if (profileUser) {
            if (isOwnProfile) {
                fetchQuizHistory();
                fetchRank();
            }
            fetchLeaderboard();
        }
    }, [profileUser, isOwnProfile]);

    if (loading) {
        return (
            <>
                <Header />
                <div className="profile-page">
                    <div className="loading">Loading profile...</div>
                </div>
            </>
        );
    }

    if (!profileUser) {
        return (
            <>
                <Header />
                <div className="profile-page">
                    <div className="loading">User not found</div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="profile-page">
                <div className="profile-left">
                    <div className="profile-header">
                        <div className="profile-info-wrapper">
                            <div className="avatar">
                                {profileUser.avatar ? (
                                    <img src={profileUser.avatar} alt={profileUser.username} className="avatar-img" />
                                ) : (
                                    profileUser.username?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="user-info">
                                <h1>{profileUser.username}</h1>
                                <p className="rank">{getRank(profileUser.otakuPoints)}</p>
                                {isOwnProfile && <p className="email">{profileUser.email}</p>}
                                {isOwnProfile && (
                                    <button className="btn primary btn-small" onClick={() => setShowEditModal(true)}>
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                        {profileUser.bio && (
                            <div className="bio-section">
                                <p className="bio-text">{profileUser.bio}</p>
                            </div>
                        )}
                    </div>
                    <div className="profile-scrollable">
                        <div className="sidebar-menu">
                            <button className={`menu-btn ${activeSection === 'achievements' ? 'active' : ''}`} onClick={() => handleSectionChange('achievements')}>
                                🏆 Achievements
                            </button>
                            <button className={`menu-btn ${activeSection === 'recent' ? 'active' : ''}`} onClick={() => handleSectionChange('recent')}>
                                📝 Recent Quiz
                            </button>
                            {isOwnProfile && (
                                <button className={`menu-btn ${activeSection === 'leaderboard' ? 'active' : ''}`} onClick={() => handleSectionChange('leaderboard')}>
                                    🏅 Leaderboard
                                </button>
                            )}
                            <button className={`menu-btn ${activeSection === 'favorites' ? 'active' : ''}`} onClick={() => handleSectionChange('favorites')}>
                                ❤️ My List
                            </button>
                            <button className={`menu-btn ${activeSection === 'statistics' ? 'active' : ''}`} onClick={() => handleSectionChange('statistics')}>
                                📊 Statistics
                            </button>
                        </div>
                        {isOwnProfile && (
                            <button className="logout-btn" onClick={handleLogout}>
                                Logout
                            </button>
                        )}
                    </div>
                </div>

                <div className="profile-right">
                    {!isOwnProfile && activeSection === 'statistics' && (
                        <>
                            <div className="stats-section">
                                <h2>{profileUser.username}'s Statistics</h2>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-value">{profileUser.otakuPoints}</div>
                                        <div className="stat-label">Otaku Points</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{profileUser.quizzesTaken || 0}</div>
                                        <div className="stat-label">Quizzes Taken</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">
                                            {globalRank !== null ? `#${globalRank}` : 'Loading...'}
                                        </div>
                                        <div className="stat-label">Global Rank</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{getRank(profileUser.otakuPoints)}</div>
                                        <div className="stat-label">Rank Title</div>
                                    </div>
                                </div>
                            </div>

                            <div className="progress-section">
                                <h2>Rank Progress</h2>
                                <div className="rank-display">
                                    <div className="current-rank">{getRank(profileUser.otakuPoints)}</div>
                                    <div className="next-rank">Next: {getNextRank(profileUser.otakuPoints).name}</div>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <img src="/goku-blast.png" alt="Goku" className="goku-blast" />
                                    <div className="progress-bar-container">
                                        <div 
                                            className="progress-bar-fill" 
                                            style={{ 
                                                width: `${(() => {
                                                    const nextRank = getNextRank(profileUser.otakuPoints);
                                                    const currentMin = getCurrentRankMin(profileUser.otakuPoints);
                                                    return nextRank.target === currentMin
                                                        ? 100
                                                        : ((profileUser.otakuPoints - currentMin) / (nextRank.target - currentMin)) * 100;
                                                })()}%` 
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="progress-text">
                                    {profileUser.otakuPoints} / {getNextRank(profileUser.otakuPoints).target} points
                                </div>
                            </div>

                            <div className="eye-power-display">
                                <h3>Eye Power</h3>
                                <div className="current-eye-power">
                                    {(() => {
                                        const eyePower = getEyePower(profileUser.otakuPoints);
                                        return (
                                            <div className="eye-power-item">
                                                {eyePower.hasImage ? (
                                                    <img src={eyePower.image} alt={eyePower.name} className="eye-power-image" />
                                                ) : (
                                                    <span className="eye-power-icon">{eyePower.icon}</span>
                                                )}
                                                <span className="eye-power-name">{eyePower.name}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {profileUser.animeList && profileUser.animeList.length > 0 && (
                                <div className="favorites-section">
                                    <h2>{profileUser.username}'s Anime List</h2>
                                    <div className="anime-list-grid">
                                        {profileUser.animeList.slice(0, 12).map((anime, index) => (
                                            <div key={index} className="anime-list-card">
                                                <div className="anime-list-image">
                                                    <img 
                                                        src={anime.image || 'https://via.placeholder.com/180x240'} 
                                                        alt={anime.title}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://via.placeholder.com/180x240';
                                                        }}
                                                    />
                                                </div>
                                                <div className="anime-list-title">{anime.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {profileUser.animeList.length > 12 && (
                                        <p className="anime-list-more">+{profileUser.animeList.length - 12} more anime</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {!isOwnProfile && activeSection === 'favorites' && (
                        <div className="favorites-section">
                            <h2>{profileUser.username}'s Anime List</h2>
                            {profileUser.animeList && profileUser.animeList.length > 0 ? (
                                <div className="anime-list-grid">
                                    {profileUser.animeList.map((anime, index) => (
                                        <div key={index} className="anime-list-card">
                                            <div className="anime-list-image">
                                                <img 
                                                    src={anime.image || 'https://via.placeholder.com/180x240'} 
                                                    alt={anime.title}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/180x240';
                                                    }}
                                                />
                                            </div>
                                            <div className="anime-list-title">{anime.title}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-activity">{profileUser.username} hasn't added any anime to their list yet.</p>
                            )}
                        </div>
                    )}

                    {!isOwnProfile && activeSection === 'recent' && (
                        <div className="activity-section">
                            <h2>{profileUser.username}'s Recent Quiz Activity</h2>
                            {profileUser.quizHistory && profileUser.quizHistory.length > 0 ? (
                                <div className="activity-list">
                                    {profileUser.quizHistory.slice(0, 10).map((quiz, index) => (
                                        <div key={index} className="activity-item">
                                            <div className="activity-info">
                                                <div className="activity-title">{quiz.animeTitle === 'Quiz' ? 'Unknown Anime' : quiz.animeTitle}</div>
                                                <div className="activity-date">{new Date(quiz.date).toLocaleDateString()}</div>
                                            </div>
                                            <div className="activity-stats">
                                                <div className="activity-score">{quiz.score}/{quiz.totalQuestions}</div>
                                                <div className="activity-points">+{quiz.pointsEarned} pts</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-activity">{profileUser.username} hasn't taken any quizzes yet.</p>
                            )}
                        </div>
                    )}

                    {!isOwnProfile && activeSection === 'achievements' && (
                        <div className="achievements-section">
                            <h2>{profileUser.username}'s Achievements</h2>
                            <div className="achievement-buttons-container">
                                <button className="achievement-category-btn anime-btn" onClick={() => handleSectionChange('anime-achievements')}>
                                    <div className="achievement-btn-content">
                                        <h3>Anime Achievements</h3>
                                        <p>View anime collection milestones</p>
                                    </div>
                                </button>
                                <button className="achievement-category-btn character-btn" onClick={() => handleSectionChange('character-achievements')}>
                                    <div className="achievement-btn-content">
                                        <h3>Character Achievements</h3>
                                        <p>View character knowledge achievements</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {!isOwnProfile && activeSection === 'anime-achievements' && (
                        <div className="achievements-section">
                            <h2>{profileUser.username}'s Anime Achievements</h2>
                            <div className="achievement-content-full">
                                {!profileUser.quizHistory || profileUser.quizHistory.length === 0 ? (
                                    <p className="no-achievements">{profileUser.username} hasn't played any anime quizzes yet.</p>
                                ) : (
                                    <div className="anime-achievements-grid">
                                        {(() => {
                                            const animeQuizzes = profileUser.quizHistory.filter(quiz => 
                                                quiz.animeTitle && !quiz.animeTitle.includes(' - ')
                                            );
                                            
                                            if (animeQuizzes.length === 0) {
                                                return <p className="no-achievements">{profileUser.username} hasn't played any anime quizzes yet.</p>;
                                            }
                                            
                                            const animeMap = {};
                                            animeQuizzes.forEach(quiz => {
                                                const title = quiz.animeTitle === 'Quiz' ? 'Unknown Anime' : quiz.animeTitle;
                                                if (!animeMap[title]) {
                                                    animeMap[title] = {
                                                        title,
                                                        image: quiz.animeImage || 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image',
                                                        quizzes: [],
                                                        totalScore: 0,
                                                        totalQuestions: 0,
                                                        totalPoints: 0
                                                    };
                                                }
                                                animeMap[title].quizzes.push(quiz);
                                                animeMap[title].totalScore += quiz.score;
                                                animeMap[title].totalQuestions += quiz.totalQuestions;
                                                animeMap[title].totalPoints += quiz.pointsEarned;
                                            });
                                            
                                            return Object.values(animeMap).map((anime, index) => (
                                                <div key={index} className="anime-achievement-card">
                                                    <div className="anime-achievement-image">
                                                        <img 
                                                            src={anime.image} 
                                                            alt={anime.title} 
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image';
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="anime-achievement-content">
                                                        <div className="anime-achievement-header">
                                                            <h3>{anime.title}</h3>
                                                        </div>
                                                        <div className="anime-quiz-count">{anime.quizzes.length} quiz{anime.quizzes.length > 1 ? 'zes' : ''} played</div>
                                                        <div className="anime-achievement-stats">
                                                            <div className="anime-stat">
                                                                <span className="anime-stat-label">Score</span>
                                                                <span className="anime-stat-value">{anime.totalScore}/{anime.totalQuestions}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isOwnProfile && activeSection === 'character-achievements' && (
                        <div className="achievements-section">
                            <h2>{profileUser.username}'s Character Achievements</h2>
                            <div className="achievement-content-full">
                                {!profileUser.quizHistory || profileUser.quizHistory.length === 0 ? (
                                    <p className="no-achievements">{profileUser.username} hasn't played any character quizzes yet.</p>
                                ) : (
                                    <div className="anime-achievements-grid">
                                        {(() => {
                                            const characterQuizzes = profileUser.quizHistory.filter(quiz => 
                                                quiz.animeTitle && quiz.animeTitle.includes(' - ')
                                            );
                                            
                                            if (characterQuizzes.length === 0) {
                                                return <p className="no-achievements">{profileUser.username} hasn't played any character quizzes yet.</p>;
                                            }
                                            
                                            return characterQuizzes.map((quiz, index) => {
                                                const [animeName, characterName] = quiz.animeTitle.split(' - ');
                                                const accuracy = Math.round((quiz.score / quiz.totalQuestions) * 100);
                                                const redOpacity = (1 - (accuracy / 100)) * 0.8;
                                                
                                                return (
                                                    <div key={index} className="anime-achievement-card character-achievement-card">
                                                        <div className="anime-achievement-image">
                                                            <img 
                                                                src={quiz.animeImage || 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image'} 
                                                                alt={characterName} 
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image';
                                                                }}
                                                            />
                                                            <div 
                                                                className="character-performance-overlay"
                                                                style={{ opacity: redOpacity }}
                                                            ></div>
                                                        </div>
                                                        <div className="anime-achievement-content">
                                                            <div className="anime-achievement-header">
                                                                <h3>{characterName}</h3>
                                                            </div>
                                                            <div className="anime-quiz-count">{animeName}</div>
                                                            <div className="anime-achievement-stats">
                                                                <div className="anime-stat">
                                                                    <span className="anime-stat-label">Score</span>
                                                                    <span className="anime-stat-value">{quiz.score}/{quiz.totalQuestions}</span>
                                                                </div>
                                                                <div className="anime-stat">
                                                                    <span className="anime-stat-label">Accuracy</span>
                                                                    <span className="anime-stat-value" style={{ color: accuracy >= 80 ? '#4caf50' : accuracy >= 50 ? '#fbbf24' : '#ff6b35' }}>{accuracy}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isOwnProfile && activeSection === 'leaderboard' && (
                        <div className="leaderboard-section">
                            <h2>Top Otaku</h2>
                            
                            <div className="eye-guide">
                                <h3>Eye Power Progression</h3>
                                <div className="eye-guide-progression">
                                    <div className="eye-guide-item">
                                        <span className="eye-guide-icon">-</span>
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Normal Eyes</span>
                                            <span className="eye-guide-points">0-49 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Byakugan.svg.png" alt="Byakugan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Byakugan</span>
                                            <span className="eye-guide-points">50-149 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Sharingan1.png" alt="Sharingan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Sharingan</span>
                                            <span className="eye-guide-points">150-199 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Sharingan2.png" alt="Sharingan (2 Tomoe)" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Sharingan (2 Tomoe)</span>
                                            <span className="eye-guide-points">200-299 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Sharingan3.png" alt="Sharingan (3 Tomoe)" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Sharingan (3 Tomoe)</span>
                                            <span className="eye-guide-points">300-499 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Mangekyou.png" alt="Mangekyou Sharingan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Mangekyou Sharingan</span>
                                            <span className="eye-guide-points">500-999 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Rinnegan.png" alt="Rinnegan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Rinnegan</span>
                                            <span className="eye-guide-points">1000+ pts</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {leaderboardData.length === 0 ? (
                                <p className="no-activity">Loading leaderboard...</p>
                            ) : (
                                <div className="leaderboard-list">
                                    {leaderboardData.map((player, index) => {
                                        const eyePower = getEyePower(player.otakuPoints);
                                        return (
                                            <div key={player._id} className={`leaderboard-item ${player._id === profileUser._id ? 'current-user' : ''}`}>
                                                <div className="leaderboard-rank">
                                                    {index === 0 && '🥇'}
                                                    {index === 1 && '🥈'}
                                                    {index === 2 && '🥉'}
                                                    {index > 2 && `#${index + 1}`}
                                                </div>
                                                <div className="leaderboard-avatar">
                                                    {player.avatar ? (
                                                        <img src={player.avatar} alt={player.username} />
                                                    ) : (
                                                        player.username?.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="leaderboard-info">
                                                    <div className="leaderboard-username">{player.username}</div>
                                                    <div className="leaderboard-rank-title">{getRank(player.otakuPoints)}</div>
                                                </div>
                                                <div className="leaderboard-eye-power" title={eyePower.name}>
                                                    {eyePower.hasImage ? (
                                                        <img 
                                                            src={eyePower.image} 
                                                            alt={eyePower.name}
                                                            className="eye-image"
                                                        />
                                                    ) : (
                                                        <span 
                                                            className="eye-icon" 
                                                            style={{ 
                                                                color: eyePower.color,
                                                                fontSize: '24px'
                                                            }}
                                                        >
                                                            {eyePower.icon}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="leaderboard-points">{player.otakuPoints} pts</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {isOwnProfile && (
                        activeSection === 'statistics' && (
                        <>
                            <div className="progress-section">
                                <h2>Rank Progress</h2>
                                <div className="rank-display">
                                    <div className="current-rank">{getRank(user.otakuPoints)}</div>
                                    <div className="next-rank">Next: {getNextRank(user.otakuPoints).name}</div>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <img src="/goku-blast.png" alt="Goku" className="goku-blast" />
                                    <div className="progress-bar-container">
                                        <div 
                                            className="progress-bar-fill" 
                                            style={{ 
                                                width: `${(() => {
                                                    const nextRank = getNextRank(user.otakuPoints);
                                                    const currentMin = getCurrentRankMin(user.otakuPoints);
                                                    return nextRank.target === currentMin
                                                        ? 100
                                                        : ((user.otakuPoints - currentMin) / (nextRank.target - currentMin)) * 100;
                                                })()}%` 
                                            }}
                                        ></div>
                                    </div>
                                    
                                </div>
                                <div className="progress-text">
                                    {user.otakuPoints} / {getNextRank(user.otakuPoints).target} points
                                </div>
                            </div>

                            <div className="stats-section">
                                <h2>Statistics</h2>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-value">{user.otakuPoints}</div>
                                        <div className="stat-label">Otaku Points</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{user.quizzesTaken || 0}</div>
                                        <div className="stat-label">Quizzes Taken</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">
                                            {(() => {
                                                const totalCorrect = quizHistory.reduce((sum, q) => sum + q.score, 0);
                                                const totalQuestions = quizHistory.reduce((sum, q) => sum + q.totalQuestions, 0);
                                                return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
                                            })()}%
                                        </div>
                                        <div className="stat-label">Accuracy</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">
                                            {globalRank !== null ? `#${globalRank}` : 'Loading...'}
                                        </div>
                                        <div className="stat-label">Global Rank</div>
                                    </div>
                                </div>
                            </div>

                            <div className="tips-section">
                                <h2>Quick Tips</h2>
                                <div className="tips-grid">
                                    <div className="tip-card">
                                        <div className="tip-icon">🎯</div>
                                        <div className="tip-content">
                                            <div className="tip-title">Take Quizzes</div>
                                            <div className="tip-text">Earn points by testing your anime knowledge</div>
                                        </div>
                                    </div>
                                    <div className="tip-card">
                                        <div className="tip-icon">⚡</div>
                                        <div className="tip-content">
                                            <div className="tip-title">Stay Accurate</div>
                                            <div className="tip-text">Higher accuracy means more points per quiz</div>
                                        </div>
                                    </div>
                                    <div className="tip-card">
                                        <div className="tip-icon">🏆</div>
                                        <div className="tip-content">
                                            <div className="tip-title">Rank Up</div>
                                            <div className="tip-text">Reach 50 points to become a Casual Fan</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                        )
                    )}

                    {isOwnProfile && activeSection === 'favorites' && (
                        <div className="favorites-section">
                            <h2>My Anime List</h2>
                            <MyAnimeList />
                        </div>
                    )}

                    {isOwnProfile && activeSection === 'recent' && (
                        <div className="activity-section">
                            <h2>Recent Quiz Activity</h2>
                            {quizHistory.length === 0 ? (
                                <p className="no-activity">No quiz activity yet. Take your first quiz!</p>
                            ) : (
                                <div className="activity-list">
                                    {quizHistory.map((quiz, index) => (
                                        <div key={index} className="activity-item">
                                            <div className="activity-info">
                                                <div className="activity-title">{quiz.animeTitle === 'Quiz' ? 'Unknown Anime' : quiz.animeTitle}</div>
                                                <div className="activity-date">{new Date(quiz.date).toLocaleDateString()}</div>
                                            </div>
                                            <div className="activity-stats">
                                                <div className="activity-score">{quiz.score}/{quiz.totalQuestions}</div>
                                                <div className="activity-points">+{quiz.pointsEarned} pts</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {isOwnProfile && activeSection === 'achievements' && (
                        <div className="achievements-section">
                            <h2>Achievements</h2>
                            <div className="achievement-buttons-container">
                                <button className="achievement-category-btn anime-btn" onClick={() => handleSectionChange('anime-achievements')}>
                                    <div className="achievement-btn-content">
                                        <h3>Anime Achievements</h3>
                                        <p>View your anime collection milestones</p>
                                    </div>
                                </button>
                                <button className="achievement-category-btn character-btn" onClick={() => handleSectionChange('character-achievements')}>
                                    <div className="achievement-btn-content">
                                        <h3>Character Achievements</h3>
                                        <p>View your character knowledge achievements</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {isOwnProfile && activeSection === 'anime-achievements' && (
                        <div className="achievements-section">
                            <h2>Anime Achievements</h2>
                            <div className="achievement-content-full">
                                {quizHistory.length === 0 ? (
                                    <p className="no-achievements">No anime quizzes played yet. Start playing to unlock achievements!</p>
                                ) : (
                                    <div className="anime-achievements-grid">
                                        {(() => {
                                            // Filter only anime quizzes (those WITHOUT " - " in title)
                                            const animeQuizzes = quizHistory.filter(quiz => 
                                                quiz.animeTitle && !quiz.animeTitle.includes(' - ')
                                            );
                                            
                                            if (animeQuizzes.length === 0) {
                                                return <p className="no-achievements">No anime quizzes played yet. Start playing to unlock achievements!</p>;
                                            }
                                            
                                            // Group quizzes by anime title
                                            const animeMap = {};
                                            animeQuizzes.forEach(quiz => {
                                                const title = quiz.animeTitle === 'Quiz' ? 'Unknown Anime' : quiz.animeTitle;
                                                if (!animeMap[title]) {
                                                    animeMap[title] = {
                                                        title,
                                                        image: quiz.animeImage || 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image',
                                                        quizzes: [],
                                                        totalScore: 0,
                                                        totalQuestions: 0,
                                                        totalPoints: 0
                                                    };
                                                }
                                                animeMap[title].quizzes.push(quiz);
                                                animeMap[title].totalScore += quiz.score;
                                                animeMap[title].totalQuestions += quiz.totalQuestions;
                                                animeMap[title].totalPoints += quiz.pointsEarned;
                                            });
                                            
                                            return Object.values(animeMap).map((anime, index) => {
                                                const accuracy = Math.round((anime.totalScore / anime.totalQuestions) * 100);
                                                return (
                                                    <div key={index} className="anime-achievement-card">
                                                        <div className="anime-achievement-image">
                                                            <img 
                                                                src={anime.image} 
                                                                alt={anime.title} 
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image';
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="anime-achievement-content">
                                                            <div className="anime-achievement-header">
                                                                <h3>{anime.title}</h3>
                                                            </div>
                                                            <div className="anime-quiz-count">{anime.quizzes.length} quiz{anime.quizzes.length > 1 ? 'zes' : ''} played</div>
                                                            <div className="anime-achievement-stats">
                                                                <div className="anime-stat">
                                                                    <span className="anime-stat-label">Score</span>
                                                                    <span className="anime-stat-value">{anime.totalScore}/{anime.totalQuestions}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isOwnProfile && activeSection === 'character-achievements' && (
                        <div className="achievements-section">
                            <h2>Character Achievements</h2>
                            <div className="achievement-content-full">
                                {quizHistory.length === 0 ? (
                                    <p className="no-achievements">No character quizzes played yet. Start playing to unlock achievements!</p>
                                ) : (
                                    <div className="anime-achievements-grid">
                                        {(() => {
                                            // Filter only character quizzes (those with " - " in title)
                                            const characterQuizzes = quizHistory.filter(quiz => 
                                                quiz.animeTitle && quiz.animeTitle.includes(' - ')
                                            );
                                            
                                            if (characterQuizzes.length === 0) {
                                                return <p className="no-achievements">No character quizzes played yet. Start playing to unlock achievements!</p>;
                                            }
                                            
                                            return characterQuizzes.map((quiz, index) => {
                                                // Split anime title and character name
                                                const [animeName, characterName] = quiz.animeTitle.split(' - ');
                                                const accuracy = Math.round((quiz.score / quiz.totalQuestions) * 100);
                                                
                                                // Calculate red overlay opacity based on performance
                                                // 0% accuracy = 0.8 opacity (very red)
                                                // 100% accuracy = 0 opacity (no red)
                                                const redOpacity = (1 - (accuracy / 100)) * 0.8;
                                                
                                                return (
                                                    <div key={index} className="anime-achievement-card character-achievement-card">
                                                        <div className="anime-achievement-image">
                                                            <img 
                                                                src={quiz.animeImage || 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image'} 
                                                                alt={characterName} 
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'https://via.placeholder.com/300x400/1a1a1a/ff6b35?text=No+Image';
                                                                }}
                                                            />
                                                            <div 
                                                                className="character-performance-overlay"
                                                                style={{ opacity: redOpacity }}
                                                            ></div>
                                                        </div>
                                                        <div className="anime-achievement-content">
                                                            <div className="anime-achievement-header">
                                                                <h3>{characterName}</h3>
                                                            </div>
                                                            <div className="anime-quiz-count">{animeName}</div>
                                                            <div className="anime-achievement-stats">
                                                                <div className="anime-stat">
                                                                    <span className="anime-stat-label">Score</span>
                                                                    <span className="anime-stat-value">{quiz.score}/{quiz.totalQuestions}</span>
                                                                </div>
                                                                <div className="anime-stat">
                                                                    <span className="anime-stat-label">Accuracy</span>
                                                                    <span className="anime-stat-value" style={{ color: accuracy >= 80 ? '#4caf50' : accuracy >= 50 ? '#fbbf24' : '#ff6b35' }}>{accuracy}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isOwnProfile && activeSection === 'leaderboard' && (
                        <div className="leaderboard-section">
                            <h2>Top Otaku</h2>
                            
                            <div className="eye-guide">
                                <h3>Eye Power Progression</h3>
                                <div className="eye-guide-progression">
                                    <div className="eye-guide-item">
                                        <span className="eye-guide-icon">-</span>
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Normal Eyes</span>
                                            <span className="eye-guide-points">0-49 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Byakugan.svg.png" alt="Byakugan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Byakugan</span>
                                            <span className="eye-guide-points">50-149 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Sharingan1.png" alt="Sharingan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Sharingan</span>
                                            <span className="eye-guide-points">150-199 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Sharingan2.png" alt="Sharingan (2 Tomoe)" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Sharingan (2 Tomoe)</span>
                                            <span className="eye-guide-points">200-299 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Sharingan3.png" alt="Sharingan (3 Tomoe)" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Sharingan (3 Tomoe)</span>
                                            <span className="eye-guide-points">300-499 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Mangekyou.png" alt="Mangekyou Sharingan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Mangekyou Sharingan</span>
                                            <span className="eye-guide-points">500-999 pts</span>
                                        </div>
                                    </div>
                                    <div className="progression-arrow">→</div>
                                    <div className="eye-guide-item">
                                        <img src="/Rinnegan.png" alt="Rinnegan" className="eye-guide-image" />
                                        <div className="eye-guide-info">
                                            <span className="eye-guide-name">Rinnegan</span>
                                            <span className="eye-guide-points">1000+ pts</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {leaderboardData.length === 0 ? (
                                <p className="no-activity">Loading leaderboard...</p>
                            ) : (
                                <div className="leaderboard-list">
                                    {leaderboardData.map((player, index) => {
                                        const eyePower = getEyePower(player.otakuPoints);
                                        return (
                                            <div key={player._id} className={`leaderboard-item ${player._id === user._id ? 'current-user' : ''}`}>
                                                <div className="leaderboard-rank">
                                                    {index === 0 && '🥇'}
                                                    {index === 1 && '🥈'}
                                                    {index === 2 && '🥉'}
                                                    {index > 2 && `#${index + 1}`}
                                                </div>
                                                <div className="leaderboard-avatar">
                                                    {player.avatar ? (
                                                        <img src={player.avatar} alt={player.username} />
                                                    ) : (
                                                        player.username?.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="leaderboard-info">
                                                    <div className="leaderboard-username">{player.username}</div>
                                                    <div className="leaderboard-rank-title">{getRank(player.otakuPoints)}</div>
                                                </div>
                                                <div className="leaderboard-eye-power" title={eyePower.name}>
                                                    {eyePower.hasImage ? (
                                                        <img 
                                                            src={eyePower.image} 
                                                            alt={eyePower.name}
                                                            className="eye-image"
                                                        />
                                                    ) : (
                                                        <span 
                                                            className="eye-icon" 
                                                            style={{ 
                                                                color: eyePower.color,
                                                                fontSize: '24px'
                                                            }}
                                                        >
                                                            {eyePower.icon}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="leaderboard-points">{player.otakuPoints} pts</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Edit Profile</h2>
                        <form className="edit-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Username</label>
                                <input type="text" name="username" defaultValue={user.username} required />
                            </div>
                            <div className="form-group">
                                <label>Bio</label>
                                <textarea name="bio" rows="3" placeholder="Tell us about yourself..." defaultValue={user.bio || ''}></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}