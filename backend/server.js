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

const app = express()

// ─── Session (for OAuth) ───────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// ─── Security headers ──────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ─── Global rate limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

// ─── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://rankotaku-frontend.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

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

// ─── MongoDB ───────────────────────────────────────────────────────
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
            return;
        } catch (error) {
            console.log(`❌ MongoDB connection attempt ${i}/${retries} failed: ${error.message}`);
            if (i < retries) {
                console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    console.log("⚠️  All MongoDB connection attempts failed. DB-dependent routes will return 503.");
};

connectDB();

// Middleware: blocks DB-dependent routes if MongoDB is not connected
const requireDB = (req, res, next) => {
    if (!isDBConnected) {
        return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
    }
    next();
};

// ─── Health check ──────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "RankOtaku API is running",
        timestamp: new Date().toISOString()
    });
});

// ─── Gemini models debug endpoint ─────────────────────────────────
app.get("/models", async (req, res) => {
    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        )
        res.json(response.data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
});

// ─── Feature routes ────────────────────────────────────────────────
app.use("/api", requireDB, quizRoutes)
app.use("/api/auth", requireDB, authRoutes)
app.use("/api", requireDB, leaderboardRoutes)
app.use("/api", requireDB, activityRoutes)
app.use("/api/agent", requireDB, agentRoutes)
app.use("/", sitemapRoutes)

// ─── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
