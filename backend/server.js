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
    origin: true, // Allow all origins in development, will be restricted by allowedOrigins check
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
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB Connected")
    } catch (error) {
        console.log("MongoDB connection failed, continuing without database")
        // Don't exit, just continue
    }
}

connectDB()

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
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axios.get("https://api.jikan.moe/v4/top/anime")
        res.json(response.data)
    } catch (error) {
        console.error('Error fetching anime:', error.response?.status, error.response?.data)
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limited. Please try again later.' })
        }
        res.status(500).json({ error: 'Failed to fetch anime data' })
    }
})

app.use("/api", quizRoutes)
app.use("/api/auth", authRoutes)
app.use("/api", leaderboardRoutes)
app.use("/api", activityRoutes)
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