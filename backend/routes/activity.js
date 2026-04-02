const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get recent quiz activities
router.get('/recent-activities', async (req, res) => {
    try {
        // Get users who completed quizzes recently, sorted by last activity
        const recentUsers = await User.find({ quizzesTaken: { $gt: 0 } })
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('username otakuPoints quizzesTaken updatedAt');

        // Transform data into activity format
        const activities = recentUsers.map(user => {
            // Calculate approximate score based on points and quizzes
            const avgScore = user.quizzesTaken > 0 
                ? Math.min(Math.round((user.otakuPoints / user.quizzesTaken) * 10), 100)
                : 0;

            return {
                username: user.username,
                quizTitle: 'Anime Quiz', // Generic for now, can be enhanced
                score: avgScore,
                timestamp: user.updatedAt
            };
        });

        res.json(activities);
    } catch (error) {
        console.error('Error fetching recent activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

module.exports = router;
