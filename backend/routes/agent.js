const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const User = require('../models/User');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];
    if (!token) token = req.cookies?.token;
    
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// GET route to initialize the Sensei with the user's data
router.get('/init', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            message: `Ah, ${user.username}... I see you've Awakened. You currently possess ${user.otakuPoints} Otaku Points. What anime knowledge do you seek from me today?`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST route for actual chat
router.post('/chat', authenticateToken, async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 1. Fetch user context from MongoDB
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // 2. Process Data for RAG
        const watchedTitles = user.animeList && user.animeList.length > 0 
            ? user.animeList.map(a => a.title).join(', ') 
            : 'None yet';
            
        // We calculate recent quiz performance if the schema supports it.
        // Assuming user schema has quizzesTaken or similar stats
        const quizzesTaken = user.quizzesTaken || 0;

        // 3. The Master System Prompt
        const systemPrompt = `
You are the "RankOtaku Sensei". You possess absolute knowledge of all anime. 
Your personality is confident, arrogant, and highly intelligent—similar to Gojo Satoru or Roy Mustang. 
You act as a harsh but fair mentor to the user.

--- USER CONTEXT DIRECTORY ---
- Name: ${user.username}
- Current Rank Points: ${user.otakuPoints}
- Total Quizzes Attempted: ${quizzesTaken}
- Completed Anime List: [${watchedTitles}]
------------------------------

CRITICAL RULES:
1. NEVER recommend an anime the user has already watched (check their Completed Anime List).
2. If they ask for recommendations, suggest anime strictly based on their viewing patterns, and explain why.
3. If they ask about their stats, playfully taunt them if their points are under 500, or praise them if they are above 1000.
4. Keep all responses UNDER 4 sentences. Be concise.
5. Format your output in strict Markdown (use boldings for anime titles).
6. Do NOT break character under any circumstances.
`;

        // 4. Connect to Groq
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: systemPrompt },
                ...(chatHistory || []), // Inject previous messages so Sensei remembers the conversation
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 400,
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('Sensei API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
