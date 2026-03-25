const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Authentication middleware
const authenticateToken = (req, res, next) => {
    // Check Authorization header first (for localStorage)
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];
    
    // Fallback to cookie (for backward compatibility)
    if (!token) {
        token = req.cookies.token;
    }
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many login attempts, try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Input validation rules
const signupValidation = [
    body('username').isLength({ min: 3, max: 20 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
];

// Signup
router.post('/signup', signupValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid input data', details: errors.array() });
        }

        const { username, email, password } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        
        res.json({ 
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email,
                otakuPoints: user.otakuPoints 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', authLimiter, loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid input data', details: errors.array() });
        }

        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        
        res.json({ 
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email,
                otakuPoints: user.otakuPoints 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).select('-password');
        
        res.json(user);
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Submit quiz answers (secure)
router.post('/submit-quiz', authenticateToken, async (req, res) => {
    try {
        const { answers, quiz, animeTitle, animeImage } = req.body;
        
        // Calculate score on backend (secure)
        let score = 0;
        for (let i = 0; i < answers.length; i++) {
            if (answers[i] === quiz[i].answer) {
                score++;
            }
        }
        
        const points = score * 10; // 10 points per correct answer
        
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { 
                $inc: { otakuPoints: points, quizzesTaken: 1 },
                $push: { 
                    quizHistory: {
                        $each: [{
                            animeTitle: animeTitle || 'Quiz',
                            animeImage: animeImage || '',
                            score,
                            totalQuestions: quiz.length,
                            pointsEarned: points,
                            date: new Date()
                        }],
                        $position: 0,
                        $slice: 10
                    }
                }
            },
            { new: true }
        ).select('-password');
        
        res.json({ 
            score, 
            totalQuestions: quiz.length,
            points,
            user,
            message: `Quiz completed! Earned ${points} otaku points!` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify token
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            token = req.cookies.token;
        }
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Get quiz history
router.get('/quiz-history', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('quizHistory');
        
        res.json({ quizHistory: user.quizHistory || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user rank
router.get('/rank', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const allUsers = await User.find()
            .select('_id otakuPoints createdAt')
            .sort({ otakuPoints: -1, createdAt: 1, _id: 1 });
        
        const rankIndex = allUsers.findIndex(u => u._id.toString() === user._id.toString());
        const rank = rankIndex + 1;
        
        res.json({ rank });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.put('/update-profile', authenticateToken, async (req, res) => {
    try {
        const { username, bio, avatar } = req.body;
        
        const updateData = {};
        if (username) updateData.username = username;
        if (bio !== undefined) updateData.bio = bio;
        if (avatar !== undefined) updateData.avatar = avatar;
        
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
            { new: true }
        ).select('-password');
        
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add anime to user's list
router.post('/add-to-list', authenticateToken, async (req, res) => {
    try {
        const { animeId, title, image, score, episodes, status } = req.body;
        
        let user = await User.findById(req.user.userId);
        
        if (!user.animeList) {
            user.animeList = [];
        }
        
        const existingAnime = user.animeList.find(anime => anime.animeId === animeId);
        if (existingAnime) {
            return res.status(400).json({ error: 'Anime already in your list' });
        }
        
        user.animeList.push({
            animeId,
            title,
            image,
            score,
            episodes,
            status,
            addedAt: new Date()
        });
        
        await user.save();
        
        res.json({ success: true, message: 'Anime added to your list' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove anime from user's list
router.delete('/remove-from-list/:animeId', authenticateToken, async (req, res) => {
    try {
        const { animeId } = req.params;
        
        await User.findByIdAndUpdate(
            req.user.userId,
            { $pull: { animeList: { animeId: parseInt(animeId) } } }
        );
        
        res.json({ success: true, message: 'Anime removed from your list' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's anime list
router.get('/my-list', authenticateToken, async (req, res) => {
    try {
        let user = await User.findById(req.user.userId);
        
        if (!user.animeList) {
            user.animeList = [];
            await user.save();
        }
        
        res.json({ animeList: user.animeList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get public user profile by ID
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Validate ObjectId format
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const allUsers = await User.find()
            .select('_id otakuPoints createdAt')
            .sort({ otakuPoints: -1, createdAt: 1, _id: 1 });
        
        const rankIndex = allUsers.findIndex(u => u._id.toString() === user._id.toString());
        const rank = rankIndex + 1;
        
        res.json({ user, rank });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Forgot password
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const { email } = req.body;
        console.log('Password reset requested for:', email);
        
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('User not found for email:', email);
            return res.json({ message: 'If email exists, reset link has been sent' });
        }
        
        console.log('User found, generating reset token...');
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        
        await user.save();
        console.log('Token saved, attempting to send email...');
        
        try {
            await sendPasswordResetEmail(user.email, resetToken);
            console.log('Email sent successfully to:', user.email);
            res.json({ message: 'Password reset link has been sent to your email' });
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            // Still return success to user for security, but log the error
            res.json({ message: 'Password reset link has been sent to your email' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset password
router.post('/reset-password/:token', [
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and number' });
        }

        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        
        console.log('Reset attempt - Token:', req.params.token);
        console.log('Hashed token:', hashedToken);
        
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        console.log('User found:', !!user);
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        
        user.password = await bcrypt.hash(req.body.password, 12);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();
        
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
