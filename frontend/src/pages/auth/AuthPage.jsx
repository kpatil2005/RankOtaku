import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import GoogleLogin from '../../components/GoogleLogin';
import './AuthPage.css';

// Debounce utility
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

const AuthPage = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const mode = searchParams.get('mode');
    const [isActive, setIsActive] = useState(mode === 'signup');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [touched, setTouched] = useState({});
    
    const { login, signup } = useAuth();
    const navigate = useNavigate();

    // Get redirect information from location state
    const from = location.state?.from || '/';
    const message = location.state?.message;

    // Debounced values for real-time validation
    const debouncedUsername = useDebounce(formData.username, 500);
    const debouncedEmail = useDebounce(formData.email, 500);
    const debouncedPassword = useDebounce(formData.password, 500);
    const debouncedConfirmPassword = useDebounce(formData.confirmPassword, 500);

    useEffect(() => {
        if (mode === 'signup') {
            setIsActive(true);
        } else {
            setIsActive(false);
        }
    }, [mode]);

    // Debounced real-time validation
    useEffect(() => {
        if (touched.username && debouncedUsername) {
            setValidationErrors(prev => ({
                ...prev,
                username: validateUsername(debouncedUsername)
            }));
        }
    }, [debouncedUsername, touched.username]);

    useEffect(() => {
        if (touched.email && debouncedEmail) {
            setValidationErrors(prev => ({
                ...prev,
                email: validateEmail(debouncedEmail)
            }));
        }
    }, [debouncedEmail, touched.email]);

    useEffect(() => {
        if (touched.password && debouncedPassword) {
            setValidationErrors(prev => ({
                ...prev,
                password: validatePassword(debouncedPassword)
            }));
        }
    }, [debouncedPassword, touched.password]);

    useEffect(() => {
        if (touched.confirmPassword && debouncedConfirmPassword) {
            setValidationErrors(prev => ({
                ...prev,
                confirmPassword: validateConfirmPassword(formData.password, debouncedConfirmPassword)
            }));
        }
    }, [debouncedConfirmPassword, formData.password, touched.confirmPassword]);

    const validateUsername = (username) => {
        if (!username) return 'Username is required';
        if (username.length < 3) return 'Username must be at least 3 characters';
        if (username.length > 20) return 'Username must be less than 20 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
        return '';
    };

    const validateEmail = (email) => {
        if (!email) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
        return '';
    };

    const validatePassword = (password) => {
        if (!password) return 'Password is required';
        if (password.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
        return '';
    };

    const validateConfirmPassword = (password, confirmPassword) => {
        if (!confirmPassword) return 'Please confirm your password';
        if (password !== confirmPassword) return 'Passwords do not match';
        return '';
    };

    const getPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/(?=.*[a-z])/.test(password)) strength++;
        if (/(?=.*[A-Z])/.test(password)) strength++;
        if (/(?=.*\d)/.test(password)) strength++;
        if (/(?=.*[@$!%*?&])/.test(password)) strength++;
        
        if (strength <= 2) return { label: 'Weak', color: '#dc2626' };
        if (strength <= 4) return { label: 'Medium', color: '#f59e0b' };
        return { label: 'Strong', color: '#10b981' };
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        setError('');
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched({ ...touched, [name]: true });
        
        const errors = { ...validationErrors };
        
        if (name === 'username') {
            errors.username = validateUsername(formData.username);
        } else if (name === 'email') {
            errors.email = validateEmail(formData.email);
        } else if (name === 'password') {
            errors.password = validatePassword(formData.password);
        } else if (name === 'confirmPassword') {
            errors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword);
        }
        
        setValidationErrors(errors);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        // Validate
        const errors = {};
        errors.email = validateEmail(formData.email);
        errors.password = formData.password ? '' : 'Password is required';
        
        if (errors.email || errors.password) {
            setValidationErrors(errors);
            setTouched({ email: true, password: true });
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                navigate(from, { replace: true });
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        
        // Validate all fields
        const errors = {};
        errors.username = validateUsername(formData.username);
        errors.email = validateEmail(formData.email);
        errors.password = validatePassword(formData.password);
        errors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword);
        
        if (errors.username || errors.email || errors.password || errors.confirmPassword) {
            setValidationErrors(errors);
            setTouched({ username: true, email: true, password: true, confirmPassword: true });
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const result = await signup(formData.username, formData.email, formData.password);
            if (result.success) {
                navigate(from, { replace: true });
            } else {
                setError(result.error || 'Signup failed');
            }
        } catch (err) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

    // Check if login form is valid
    const isLoginValid = formData.email && formData.password && 
                         !validationErrors.email && !validationErrors.password;

    // Check if signup form is valid
    const isSignupValid = formData.username && formData.email && 
                          formData.password && formData.confirmPassword &&
                          !validationErrors.username && !validationErrors.email && 
                          !validationErrors.password && !validationErrors.confirmPassword;

    return (
        <div className="auth-page">
                <div className={`container ${isActive ? 'active' : ''}`}>
                    <div className="form-box login">
                    <form onSubmit={handleLogin}>
                        <h1>Login</h1>
                        {message && <div className="info-message">{message}</div>}
                        {error && <div className="error-message">{error}</div>}
                        <div className="input-box">
                            <input 
                                type="email" 
                                name="email"
                                placeholder="Email" 
                                value={formData.email}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className={touched.email && validationErrors.email ? 'error' : ''}
                            />
                            <i className='bx bxs-envelope'></i>
                            {touched.email && validationErrors.email && (
                                <span className="validation-error">{validationErrors.email}</span>
                            )}
                        </div>
                        <div className="input-box">
                            <input 
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="Password" 
                                value={formData.password}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className={touched.password && validationErrors.password ? 'error' : ''}
                            />
                            <i className='bx bxs-lock-alt'></i>
                            <i 
                                className={`bx ${showPassword ? 'bx-hide' : 'bx-show'} password-toggle`}
                                onClick={() => setShowPassword(!showPassword)}
                            ></i>
                            {touched.password && validationErrors.password && (
                                <span className="validation-error">{validationErrors.password}</span>
                            )}
                        </div>
                        <button type="submit" className="btn" disabled={loading || !isLoginValid}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                        <div className="social-login">
                            <GoogleLogin />
                        </div>
                        <div className="forgot-password-link">
                            <a href="/forgot-password">Forgot Password?</a>
                        </div>
                    </form>
                </div>

                <div className="form-box register">
                    <form onSubmit={handleSignup}>
                        <h1>Registration</h1>
                        {error && <div className="error-message">{error}</div>}
                        <div className="input-box">
                            <input 
                                type="text" 
                                name="username"
                                placeholder="Username" 
                                value={formData.username}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className={touched.username && validationErrors.username ? 'error' : ''}
                            />
                            <i className='bx bxs-user'></i>
                            {touched.username && validationErrors.username && (
                                <span className="validation-error">{validationErrors.username}</span>
                            )}
                        </div>
                        <div className="input-box">
                            <input 
                                type="email" 
                                name="email"
                                placeholder="Email" 
                                value={formData.email}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className={touched.email && validationErrors.email ? 'error' : ''}
                            />
                            <i className='bx bxs-envelope'></i>
                            {touched.email && validationErrors.email && (
                                <span className="validation-error">{validationErrors.email}</span>
                            )}
                        </div>
                        <div className="input-box">
                            <input 
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="Password" 
                                value={formData.password}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className={touched.password && validationErrors.password ? 'error' : ''}
                            />
                            <i className='bx bxs-lock-alt'></i>
                            <i 
                                className={`bx ${showPassword ? 'bx-hide' : 'bx-show'} password-toggle`}
                                onClick={() => setShowPassword(!showPassword)}
                            ></i>
                            {touched.password && validationErrors.password && (
                                <span className="validation-error">{validationErrors.password}</span>
                            )}
                            {formData.password && !validationErrors.password && passwordStrength && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div 
                                            className="strength-fill" 
                                            style={{ 
                                                width: passwordStrength.label === 'Weak' ? '33%' : passwordStrength.label === 'Medium' ? '66%' : '100%',
                                                backgroundColor: passwordStrength.color 
                                            }}
                                        ></div>
                                    </div>
                                    <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                                </div>
                            )}
                        </div>
                        <div className="input-box">
                            <input 
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                placeholder="Confirm Password" 
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className={touched.confirmPassword && validationErrors.confirmPassword ? 'error' : ''}
                            />
                            <i className='bx bxs-lock-alt'></i>
                            <i 
                                className={`bx ${showConfirmPassword ? 'bx-hide' : 'bx-show'} password-toggle`}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            ></i>
                            {touched.confirmPassword && validationErrors.confirmPassword && (
                                <span className="validation-error">{validationErrors.confirmPassword}</span>
                            )}
                        </div>
                        <button type="submit" className="btn" disabled={loading || !isSignupValid}>
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                        <div className="social-login">
                            <GoogleLogin />
                        </div>
                    </form>
                </div>

                <div className="toggle-box">
                    <div className="toggle-panel toggle-left">
                        <h1>Hello, Welcome!</h1>
                        <p>Don't have an account?</p>
                        <button 
                            className="btn register-btn" 
                            onClick={() => setIsActive(true)}
                            type="button"
                        >
                            Register
                        </button>
                    </div>

                    <div className="toggle-panel toggle-right">
                        <h1>Welcome Back!</h1>
                        <p>Already have an account?</p>
                        <button 
                            className="btn login-btn" 
                            onClick={() => setIsActive(false)}
                            type="button"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;