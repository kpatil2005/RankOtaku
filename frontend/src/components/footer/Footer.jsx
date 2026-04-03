import React from 'react'
import './Footer.css'

export function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                {/* Brand Section */}
                <div className="footer-brand">
                    <h2 className="brand-title">RankOtaku</h2>
                    <p className="brand-description">
                        Test your anime knowledge and compete with otaku worldwide.
                    </p>
                </div>

                {/* Essential Links */}
                <div className="footer-links">
                    <div className="link-group">
                        <ul>
                            <li><a href="/">Home</a></li>
                            <li><a href="/leaderboard">Leaderboard</a></li>
                            <li><a href="/privacy">Privacy</a></li>
                            <li><a href="/terms">Terms</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="footer-bottom">
                <div className="footer-info">
                    <div className="copyright">
                        <p>&copy; 2024 RankOtaku. All rights reserved.</p>
                        <p className="api-credit">Powered by Jikan API</p>
                    </div>
                    
                    <div className="developer-info">
                        <p>Built by <strong>Kalpesh Patil</strong></p>
                        <div className="developer-links">
                            <a href="https://stylehub-ecommerce-react.vercel.app" target="_blank" rel="noopener noreferrer">Portfolio</a>
                            <a href="https://linkedin.com/in/kalpesh-patil-2a30a9290" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}