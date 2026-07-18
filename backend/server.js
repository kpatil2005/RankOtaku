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
const AnimeData = require("./models/AnimeData")

// Request queue to respect Jikan rate limits (3 req/sec, 60 req/min)
class JikanQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.lastRequest = 0;
        this.minDelay = 1000; // 1 second between requests = 1 req/sec (very safe)
    }

    async add(fn, retries = 3) {
        return new Promise((resolve, reject) => {
            const wrappedFn = async () => {
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        return await fn();
                    } catch (err) {
                        const isNetworkErr = !err.response;
                        const isRateLimit = err.response?.status === 429;
                        if (attempt < retries && (isNetworkErr || isRateLimit)) {
                            const delay = isRateLimit ? 3000 : 1000 * attempt;
                            console.log(`Jikan retry ${attempt}/${retries} after ${delay}ms...`);
                            await new Promise(r => setTimeout(r, delay));
                        } else {
                            throw err;
                        }
                    }
                }
            };
            this.queue.push({ fn: wrappedFn, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        const { fn, resolve, reject } = this.queue.shift();
        
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        
        if (timeSinceLastRequest < this.minDelay) {
            await new Promise(r => setTimeout(r, this.minDelay - timeSinceLastRequest));
        }
        
        this.lastRequest = Date.now();
        
        fn().then(resolve).catch(reject).finally(() => {
            this.processing = false;
            this.process();
        });
    }
}

const jikanQueue = new JikanQueue();

// Cache: TTL = 1 hour (3600 seconds) - Increased to reduce API calls
// Top anime lists don't change frequently
const animeCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 })

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

        // Cache miss — fetch from Jikan API with queue
        console.log("🌐 Fetching top anime from Jikan API...")
        const response = await jikanQueue.add(() => 
            axios.get("https://api.jikan.moe/v4/top/anime", { timeout: 15000 })
        );

        // Store in cache for 1 hour
        animeCache.set("top_anime", response.data)

        res.json(response.data)
    } catch (error) {
        const status = error.response?.status;
        console.error('Error fetching anime:', status ?? error.code ?? error.message)
        if (status === 429) {
            return res.status(429).json({ error: 'Rate limited. Please try again later.' })
        }
        res.status(500).json({ error: 'Failed to fetch anime data', detail: error.code || error.message })
    }
})

// Cached: Seasons/Airing now
app.get("/api/jikan/seasons/now", async (req, res) => {
    try {
        const cached = animeCache.get("seasons_now");
        if (cached) return res.json(cached);

        const response = await jikanQueue.add(() => 
            axios.get("https://api.jikan.moe/v4/seasons/now?limit=10", { timeout: 15000 })
        );
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

        const response = await jikanQueue.add(() => 
            axios.get("https://api.jikan.moe/v4/top/anime?type=movie&limit=10", { timeout: 15000 })
        );
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

        const response = await jikanQueue.add(() => 
            axios.get("https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=10", { timeout: 15000 })
        );
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

// Cached: Anime episodes by ID with MongoDB caching (1 week)
app.get("/api/jikan/anime/:id/episodes", async (req, res) => {
    try {
        const { id } = req.params;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Check MongoDB cache first
        let animeData = await AnimeData.findOne({ 
            mal_id: parseInt(id),
            lastUpdated: { $gte: oneWeekAgo }
        });
        
        if (animeData && animeData.episodes.length > 0) {
            console.log(`✅ Serving episodes for anime ${id} from MongoDB cache`);
            return res.json({ data: animeData.episodes });
        }
        
        // Cache miss or expired - fetch from Jikan API
        console.log(`🌐 Fetching episodes for anime ${id} from Jikan API...`);
        const response = await jikanQueue.add(() => 
            axios.get(`https://api.jikan.moe/v4/anime/${id}/episodes`)
        );
        
        // Update or create in MongoDB
        await AnimeData.findOneAndUpdate(
            { mal_id: parseInt(id) },
            { 
                mal_id: parseInt(id),
                episodes: response.data.data,
                lastUpdated: new Date()
            },
            { upsert: true, returnDocument: 'after' }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching episodes:', error.response?.status, error.response?.data);
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limited. Please try again later.' });
        }
        res.status(500).json({ error: 'Failed to fetch episodes' });
    }
});

// Cached: Anime relations by ID with MongoDB caching (1 week)
app.get("/api/jikan/anime/:id/relations", async (req, res) => {
    try {
        const { id } = req.params;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Check MongoDB cache first
        let animeData = await AnimeData.findOne({ 
            mal_id: parseInt(id),
            lastUpdated: { $gte: oneWeekAgo }
        });
        
        if (animeData && animeData.seasons && animeData.seasons.length > 0) {
            console.log(`✅ Serving relations for anime ${id} from MongoDB cache`);
            return res.json({ data: animeData.seasons });
        }
        
        // Cache miss or expired - fetch from Jikan API
        console.log(`🌐 Fetching relations for anime ${id} from Jikan API...`);
        const response = await jikanQueue.add(() => 
            axios.get(`https://api.jikan.moe/v4/anime/${id}/relations`)
        );
        
        // Update or create in MongoDB
        await AnimeData.findOneAndUpdate(
            { mal_id: parseInt(id) },
            { 
                mal_id: parseInt(id),
                seasons: response.data.data || [],
                lastUpdated: new Date()
            },
            { upsert: true, returnDocument: 'after' }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching relations:', error.response?.status, error.response?.data);
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limited. Please try again later.' });
        }
        // Return empty data instead of error to prevent frontend crashes
        res.json({ data: [] });
    }
});



// Bulk store popular anime data (for admin use)
app.post("/api/bulk-store-anime", async (req, res) => {
    try {
        const { animeIds } = req.body; // Array of anime IDs
        
        if (!animeIds || !Array.isArray(animeIds)) {
            return res.status(400).json({ error: 'animeIds array is required' });
        }
        
        const results = [];
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        for (const animeId of animeIds) {
            try {
                // Check if already cached
                const existing = await AnimeData.findOne({ 
                    mal_id: parseInt(animeId),
                    lastUpdated: { $gte: oneWeekAgo }
                });
                
                if (existing) {
                    results.push({ animeId, status: 'already_cached', title: existing.title });
                    continue;
                }
                
                // Fetch anime details first to get title
                const animeResponse = await jikanQueue.add(() => 
                    axios.get(`https://api.jikan.moe/v4/anime/${animeId}`)
                );
                
                // Fetch episodes and relations
                const [episodesResponse, relationsResponse] = await Promise.all([
                    jikanQueue.add(() => axios.get(`https://api.jikan.moe/v4/anime/${animeId}/episodes`)),
                    jikanQueue.add(() => axios.get(`https://api.jikan.moe/v4/anime/${animeId}/relations`))
                ]);
                
                // Store in MongoDB
                await AnimeData.findOneAndUpdate(
                    { mal_id: parseInt(animeId) },
                    {
                        mal_id: parseInt(animeId),
                        title: animeResponse.data.data.title,
                        episodes: episodesResponse.data.data || [],
                        seasons: relationsResponse.data.data || [],
                        lastUpdated: new Date()
                    },
                    { upsert: true, returnDocument: 'after' }
                );
                
                results.push({ 
                    animeId, 
                    status: 'stored', 
                    title: animeResponse.data.data.title,
                    episodesCount: episodesResponse.data.data?.length || 0,
                    seasonsCount: relationsResponse.data.data?.length || 0
                });
                
                // Add delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                results.push({ 
                    animeId, 
                    status: 'error', 
                    error: error.message 
                });
            }
        }
        
        res.json({
            message: `Processed ${animeIds.length} anime`,
            results: results,
            summary: {
                total: animeIds.length,
                stored: results.filter(r => r.status === 'stored').length,
                cached: results.filter(r => r.status === 'already_cached').length,
                errors: results.filter(r => r.status === 'error').length
            }
        });
        
    } catch (error) {
        console.error('Error in bulk store:', error);
        res.status(500).json({ error: 'Failed to bulk store anime data' });
    }
});

// Store anime data when user visits anime page
app.post("/api/store-anime-data/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        
        // Check if data already exists and is recent
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const existingData = await AnimeData.findOne({ 
            mal_id: parseInt(id),
            lastUpdated: { $gte: oneWeekAgo }
        });
        
        if (existingData) {
            return res.json({ 
                message: 'Data already cached and recent',
                cached: true,
                lastUpdated: existingData.lastUpdated
            });
        }
        
        console.log(`🎬 Storing anime data for ${title} (ID: ${id})`);
        
        // Fetch episodes and relations in parallel
        const [episodesResponse, relationsResponse] = await Promise.all([
            jikanQueue.add(() => axios.get(`https://api.jikan.moe/v4/anime/${id}/episodes`)),
            jikanQueue.add(() => axios.get(`https://api.jikan.moe/v4/anime/${id}/relations`))
        ]);
        
        // Store in MongoDB
        const animeData = await AnimeData.findOneAndUpdate(
            { mal_id: parseInt(id) },
            {
                mal_id: parseInt(id),
                title: title,
                episodes: episodesResponse.data.data || [],
                seasons: relationsResponse.data.data || [],
                lastUpdated: new Date()
            },
            { upsert: true, returnDocument: 'after' }
        );
        
        res.json({
            message: 'Anime data stored successfully',
            cached: false,
            episodesCount: animeData.episodes.length,
            seasonsCount: animeData.seasons.length,
            lastUpdated: animeData.lastUpdated
        });
        
    } catch (error) {
        console.error('Error storing anime data:', error);
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limited. Data will be cached on next request.' });
        }
        res.status(500).json({ error: 'Failed to store anime data' });
    }
});

// Get anime cache statistics
app.get("/api/anime-cache-stats", async (req, res) => {
    try {
        const totalCached = await AnimeData.countDocuments();
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentCached = await AnimeData.countDocuments({
            lastUpdated: { $gte: oneWeekAgo }
        });
        const oldCached = totalCached - recentCached;
        
        res.json({
            total: totalCached,
            recent: recentCached,
            old: oldCached,
            cacheHitRate: totalCached > 0 ? ((recentCached / totalCached) * 100).toFixed(2) + '%' : '0%'
        });
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({ error: 'Failed to get cache stats' });
    }
});

// Cleanup old anime data (older than 1 week)
app.get("/api/cleanup-anime-cache", async (req, res) => {
    try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const result = await AnimeData.deleteMany({
            lastUpdated: { $lt: oneWeekAgo }
        });
        
        res.json({
            message: `Cleaned up ${result.deletedCount} old anime cache entries`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error cleaning up anime cache:', error);
        res.status(500).json({ error: 'Failed to cleanup cache' });
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



