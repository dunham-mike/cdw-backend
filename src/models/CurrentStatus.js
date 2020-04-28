const mongoose = require('mongoose');

const TrainStatusSchema = new mongoose.Schema({
    stopId: {
        type: String,
        required: true
    },
    station: {
        type: String,
        required: true
    },
    direction: {
        type: String,
        required: true,
        enum: ['NB', 'SB'],
    },
    trainNumber: {
        type: String,
        required: true
    },
    scheduledDepartureTime: {
        type: Date,
        required: true,
    },
    expectedDepartureTime: {
        type: Date,
        required: true,
    },
    minutesLate: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Early', 'On Time', 'Late', 'Canceled']
    },
});

const CurrentStatusSchema = new mongoose.Schema({
    currentStatuses: [TrainStatusSchema]
},
{
    collection: 'current-statuses',
    timestamps: true
});

module.exports = CurrentStatus = mongoose.model('current-status', CurrentStatusSchema);