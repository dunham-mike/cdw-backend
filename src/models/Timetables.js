const mongoose = require('mongoose');

const TimetablesSchema = new mongoose.Schema({
    operator: {
        type: String,
        required: true
    },
    updated_date: {
        type: Date,
        default: Date.now
    },
    scheduleType: {
        type: String,
        require: true
    },
    timetables: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
});

module.exports = Timetables = mongoose.model('timetables', TimetablesSchema);