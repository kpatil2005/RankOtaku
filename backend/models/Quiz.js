const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    animeTitle: {
        type: String,
        required: true,
    },
    characterName: {
        type: String,
        default: null
    },
    quizType: {
        type: String,
        enum: ['anime', 'character'],
        default: 'anime'
    },
    questions: [{
        question: String,
        options: [String],
        answer: String,
        difficulty: String
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400  // auto-delete after 24 hours (TTL index)
    }
});

// Compound index: allows same anime to have both anime + character quizzes
quizSchema.index({ animeTitle: 1, quizType: 1, characterName: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;