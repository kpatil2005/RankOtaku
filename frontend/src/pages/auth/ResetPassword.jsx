import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './ForgotPassword.css';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { token } = useParams();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            setError('Password must contain uppercase, lowercase, and number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/reset-password/${token}`, { password });
            alert('Password reset successful! Please login with your new password.');
            navigate('/auth');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-page">
            <div className="forgot-password-container">
                <h1>RESET PASSWORD</h1>
                <p className="forgot-password-subtitle">Enter your new password</p>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="input-box">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <i className='bx bxs-lock-alt'></i>
                        <i 
                            className={`bx ${showPassword ? 'bx-hide' : 'bx-show'} password-toggle`}
                            onClick={() => setShowPassword(!showPassword)}
                        ></i>
                    </div>
                    
                    <div className="input-box">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <i className='bx bxs-lock-alt'></i>
                        <i 
                            className={`bx ${showConfirmPassword ? 'bx-hide' : 'bx-show'} password-toggle`}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        ></i>
                    </div>
                    
                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? 'RESETTING...' : 'RESET PASSWORD'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
