import './header.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export function Header() {
    const { user, logout, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const handleLeaderboardClick = (e) => {
        e.preventDefault();
        if (user) {
            navigate('/profile', { state: { section: 'leaderboard' } });
        } else {
            navigate('/auth?mode=login');
        }
    };

    const handleMyListClick = (e) => {
        e.preventDefault();
        if (user) {
            navigate('/profile', { state: { section: 'favorites' } });
        } else {
            navigate('/auth?mode=login');
        }
    };

    return (
        <>
            <div className="navbar">
                <Link to="/" className="logo">
                    RankOtaku
                </Link>

                <button className="hamburger" onClick={() => setIsSidebarOpen(true)}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav className="nav-links">
                    <Link to="/">Home</Link>
                    <button className="nav-button" onClick={handleLeaderboardClick}>
                        Leaderboard
                    </button>
                    <button className="nav-button" onClick={handleMyListClick}>
                        My List
                    </button>
                    <Link to="/profile">Profile</Link>
                </nav>

                <div className="auth-buttons">
                    {isAuthenticated ? (
                        <>
                            <div className="user-info">
                                <span className="user-name">Welcome, {user?.username}!</span>
                                <span className="otaku-points">⭐ {user?.otakuPoints || 0} Otaku Points</span>
                            </div>
                            <button className="logout" onClick={logout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button className="login" onClick={() => navigate('/auth')}>Login</button>
                            <button className="signup" onClick={() => navigate('/auth')}>Sign Up</button>
                        </>
                    )}
                </div>
            </div>

            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-logo" onClick={() => setIsSidebarOpen(false)}>
                        RankOtaku
                    </Link>
                    <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
                </div>

                <nav className="sidebar-links">
                    <Link to="/" onClick={() => setIsSidebarOpen(false)}>Home</Link>
                    <button className="sidebar-button" onClick={(e) => { handleLeaderboardClick(e); setIsSidebarOpen(false); }}>
                        Leaderboard
                    </button>
                    <button className="sidebar-button" onClick={(e) => { handleMyListClick(e); setIsSidebarOpen(false); }}>
                        My List
                    </button>
                    <Link to="/profile" onClick={() => setIsSidebarOpen(false)}>Profile</Link>
                </nav>

                <div className="sidebar-auth">
                    {isAuthenticated ? (
                        <>
                            <div className="sidebar-user-info">
                                <span className="sidebar-user-name">{user?.username}</span>
                                <span className="sidebar-points">⭐ {user?.otakuPoints || 0} Points</span>
                            </div>
                            <button className="sidebar-logout" onClick={() => { logout(); setIsSidebarOpen(false); }}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button className="sidebar-login" onClick={() => { navigate('/auth'); setIsSidebarOpen(false); }}>Login</button>
                            <button className="sidebar-signup" onClick={() => { navigate('/auth'); setIsSidebarOpen(false); }}>Sign Up</button>
                        </>
                    )}
                </div>
            </div>

            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
        </>
    )
}

