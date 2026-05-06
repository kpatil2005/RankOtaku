import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Turnstile from '../../components/Turnstile';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!turnstileToken) {
            setError('Please wait for security verification to complete...');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, { 
                email,
                turnstileToken 
            });
            setMessage('If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.');
            setEmail('');
            if (window.turnstile) {
                window.turnstile.reset();
            }
            setTurnstileToken('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset email');
            if (window.turnstile) {
                window.turnstile.reset();
            }
            setTurnstileToken('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-page">
            <div className="forgot-password-container">
                <h1>FORGOT PASSWORD</h1>
                <p className="forgot-password-subtitle">Enter your email to receive a password reset link</p>
                
                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="input-box">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <i className='bx bxs-envelope'></i>
                    </div>
                    
                    <Turnstile 
                        onVerify={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken('')}
                    />
                    
                    <button type="submit" className="btn" disabled={loading || !turnstileToken}>
                        {loading ? 'SENDING...' : turnstileToken ? 'SEND RESET LINK' : 'VERIFYING SECURITY...'}
                    </button>
                </form>
                
                <button className="back-btn" onClick={() => navigate('/auth')}>
                    BACK TO LOGIN
                </button>
            </div>
        </div>
    );
};

export default ForgotPassword;
