const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    animeTitle: {
        type: String,
        required: true,
        unique: true
    },
    questions: [{
        question: String,
        options: [String],
        answer: String,
        difficulty: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Quiz', quizSchema);