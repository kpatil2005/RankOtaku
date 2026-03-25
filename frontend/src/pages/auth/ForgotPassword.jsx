import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, { email });
            setMessage('If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.');
            setEmail('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset email');
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
                    
                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? 'SENDING...' : 'SEND RESET LINK'}
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
