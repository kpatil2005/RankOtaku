const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get leaderboard - top users by otaku points with ranking
router.get('/leaderboard', async (req, res) => {
    try {
        console.log('=== LEADERBOARD REQUEST ===');
        
        const topUsers = await User.find()
            .select('username otakuPoints quizzesTaken createdAt avatar bio _id')
            .sort({ 
                otakuPoints: -1,    // Higher points first
                createdAt: 1,       // Earlier signup first (tie-breaker 1)
                _id: 1              // Database ID as final tie-breaker
            })
            .limit(10);
        
        // Add ranking information to each user
        const leaderboardData = topUsers.map((user, index) => {
            const userObj = user.toObject();
            const rank = index + 1;
            
            // Determine rank tier (S, A, B, C, D)
            let rankTier = 'D';
            if (rank === 1) rankTier = 'S';
            else if (rank === 2 || rank === 3) rankTier = 'A';
            else if (rank >= 4 && rank <= 6) rankTier = 'B';
            else if (rank >= 7 && rank <= 8) rankTier = 'C';
            else rankTier = 'D';
            
            // Calculate level based on points
            const level = Math.floor(userObj.otakuPoints / 100) + 1;
            
            return {
                ...userObj,
                rank,
                rankTier,
                level,
                pointsToNextLevel: ((level * 100) - userObj.otakuPoints),
                averagePointsPerQuiz: userObj.quizzesTaken > 0 ? Math.round(userObj.otakuPoints / userObj.quizzesTaken) : 0
            };
        });
        
        console.log('Leaderboard users found:', leaderboardData.length);
        console.log('Leaderboard with ranking tiers:');
        leaderboardData.forEach((user) => {
            console.log(`${user.rank}. [${user.rankTier}] ${user.username} - ${user.otakuPoints} pts (Lvl ${user.level})`);
        });
        
        res.json(leaderboardData);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;