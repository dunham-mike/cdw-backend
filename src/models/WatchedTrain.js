const mongoose = require('mongoose');

const WatchedTrainSchema = new mongoose.Schema({
    operator: {
        type: String,
        required: true,
    },
    scheduleType: {
        type: String, 
        required: true,
        enum: ['Weekday', 'Weekend'],
    },
    active: {
        type: Boolean,
        required: true,
        default: true,
    },
    usersWatching: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    trainInfo: {
        station: {
            type: String,
            required: true,
        },
        stopId: {
            type: String,
            required: true,
        },
        direction: {
            type: String,
            required: true,
            enum: ['NB', 'SB'],
        },
        time: {
            type: String,
            required: true,
        },
        trainNumber: {
            type: String,
            required: true,
        },
    }
}, {timestamps: true});

module.exports = WatchedTrain = mongoose.model('watched-train', WatchedTrainSchema);