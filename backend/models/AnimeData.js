const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
    mal_id: Number,
    title: String,
    synopsis: String,
    aired: Date,
    duration: String
});

const seasonSchema = new mongoose.Schema({
    relation: String,
    entry: [{
        mal_id: Number,
        name: String,
        type: String
    }]
});

const animeDataSchema = new mongoose.Schema({
    mal_id: {
        type: Number,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    episodes: [episodeSchema],
    seasons: [seasonSchema],
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
animeDataSchema.index({ lastUpdated: 1 });

module.exports = mongoose.model('AnimeData', animeDataSchema);