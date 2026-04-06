const express = require("express")
const axios = require("axios")
const cors = require("cors")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const session = require("express-session")
require("dotenv").config()
const quizRoutes = require("./routes/quiz")
const authRoutes = require("./routes/auth")
const leaderboardRoutes = require("./routes/leaderboard")
const activityRoutes = require("./routes/activity")
const sitemapRoutes = require("./routes/sitemap")
const agentRoutes = require("./routes/agent")
const NodeCache = require("node-cache")

// Cache: TTL = 10 minutes (600 seconds)
// Top anime lists don't change frequently
const animeCache = new NodeCache({ stdTTL: 600, checkperiod: 120 })

const app = express()

// Session setup for OAuth
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(globalLimiter);

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://rankotaku-frontend.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

// CORS configuration - simplified for production
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// MongoDB Connection
// Track DB connection state
let isDBConnected = false;

const connectDB = async (retries = 5, delay = 3000) => {
    for (let i = 1; i <= retries; i++) {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            console.log("✅ MongoDB Connected");
            isDBConnected = true;
            // Drop old unique index on animeTitle (causes 500 on character quizzes)
            const Quiz = require('./models/Quiz');
            Quiz.collection.dropIndex('animeTitle_1').catch(() => {});
            return; // success — stop retrying
        } catch (error) {
            console.log(`❌ MongoDB connection attempt ${i}/${retries} failed: ${error.message}`);
            if (i < retries) {
                console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // exponential backoff: 3s → 6s → 12s → 24s → 48s
            }
        }
    }
    console.log("⚠️  All MongoDB connection attempts failed. DB-dependent routes will return 503.");
};

connectDB();

// Middleware: blocks DB routes if MongoDB is not connected
const requireDB = (req, res, next) => {
    if (!isDBConnected) {
        return res.status(503).json({
            error: 'Database unavailable. Please try again later.'
        });
    }
    next();
};


// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "RankOtaku API is running",
        timestamp: new Date().toISOString()
    });
});

app.get("/home", async (req, res) => {
    try {
        // Check cache first
        const cachedData = animeCache.get("top_anime")
        if (cachedData) {
            console.log("✅ Serving top anime from cache")
            return res.json(cachedData)
        }

        // Cache miss — fetch from Jikan API
        console.log("🌐 Fetching top anime from Jikan API...")
        await new Promise(resolve => setTimeout(resolve, 500)); // shorter delay now
        const response = await axios.get("https://api.jikan.moe/v4/top/anime")

        // Store in cache for 10 minutes
        animeCache.set("top_anime", response.data)

        res.json(response.data)
    } catch (error) {
        console.error('Error fetching anime:', error.response?.status, error.response?.data)
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limited. Please try again later.' })
        }
        res.status(500).json({ error: 'Failed to fetch anime data' })
    }
})

// Cached: Seasons/Airing now
app.get("/api/jikan/seasons/now", async (req, res) => {
    try {
        const cached = animeCache.get("seasons_now");
        if (cached) return res.json(cached);

        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await axios.get("https://api.jikan.moe/v4/seasons/now?limit=10");
        animeCache.set("seasons_now", response.data);
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 429)
            return res.status(429).json({ error: 'Rate limited. Try again later.' });
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Cached: Top movies
app.get("/api/jikan/top/movies", async (req, res) => {
    try {
        const cached = animeCache.get("top_movies");
        if (cached) return res.json(cached);

        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await axios.get("https://api.jikan.moe/v4/top/anime?type=movie&limit=10");
        animeCache.set("top_movies", response.data);
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 429)
            return res.status(429).json({ error: 'Rate limited. Try again later.' });
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Cached: Top by popularity  
app.get("/api/jikan/top/popularity", async (req, res) => {
    try {
        const cached = animeCache.get("top_popularity");
        if (cached) return res.json(cached);

        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await axios.get("https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=10");
        animeCache.set("top_popularity", response.data);
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 429)
            return res.status(429).json({ error: 'Rate limited. Try again later.' });
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Cached: Anime details by ID (10 min TTL)
app.get("/api/jikan/anime/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `anime_${id}`;
        const cached = animeCache.get(cacheKey);
        if (cached) return res.json(cached);

        const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);
        animeCache.set(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 429)
            return res.status(429).json({ error: 'Rate limited. Try again later.' });
        res.status(500).json({ error: 'Failed to fetch anime details' });
    }
});

// Cached: Anime characters by ID (10 min TTL)
app.get("/api/jikan/anime/:id/characters", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `anime_chars_${id}`;
        const cached = animeCache.get(cacheKey);
        if (cached) return res.json(cached);

        const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}/characters`);
        animeCache.set(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 429)
            return res.status(429).json({ error: 'Rate limited. Try again later.' });
        res.status(500).json({ error: 'Failed to fetch characters' });
    }
});

// Cached: Anime staff by ID (10 min TTL)
app.get("/api/jikan/anime/:id/staff", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `anime_staff_${id}`;
        const cached = animeCache.get(cacheKey);
        if (cached) return res.json(cached);

        // Delay: staff is 4th Jikan call on page load, spread them out
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}/staff`);
        animeCache.set(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 429)
            return res.status(429).json({ error: 'Rate limited. Try again later.' });
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// Cached: Anime pictures by ID (10 min TTL)
app.get("/api/jikan/anime/:id/pictures", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `anime_pics_${id}`;
        const cached = animeCache.get(cacheKey);
        if (cached) return res.json(cached);

        const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}/pictures`);
        animeCache.set(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 429)
            return res.status(429).json({ error: 'Rate limited. Try again later.' });
        res.status(500).json({ error: 'Failed to fetch pictures' });
    }
});



app.use("/api", requireDB, quizRoutes)
app.use("/api/auth", requireDB, authRoutes)
app.use("/api", requireDB, leaderboardRoutes)
app.use("/api", requireDB, activityRoutes)
app.use("/api/agent", requireDB, agentRoutes)
app.use("/", sitemapRoutes)

app.get("/models", async (req, res) => {
    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        )
        res.json(response.data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



