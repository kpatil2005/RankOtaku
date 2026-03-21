const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    otakuPoints: {
        type: Number,
        default: 0
    },
    quizzesTaken: {
        type: Number,
        default: 0
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    quizHistory: [{
        animeTitle: String,
        animeImage: String,
        score: Number,
        totalQuestions: Number,
        pointsEarned: Number,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    animeList: [{
        animeId: {
            type: Number,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        image: String,
        score: Number,
        episodes: Number,
        status: String,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
