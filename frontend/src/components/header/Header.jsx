import './header.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
    const { user, logout, isAuthenticated } = useAuth()
    const navigate = useNavigate()

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
        <div className="navbar">
            <Link to="/" className="logo">
                RankOtaku
            </Link>

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
    )
}

