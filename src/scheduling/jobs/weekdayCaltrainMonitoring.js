const debug = require('debug')('app:weekdayCaltrainMonitoring');
// const schedule = require('node-schedule');
const moment = require('moment-timezone');

const weekdayCaltrainMonitoring = () => {
    debug('Monitor Caltrain Delays here! The time is:', moment(Date.now()).tz("America/Los_Angeles").format('h:mm a') );

    // TODO: When a new WatchedTrain is created in watchedTrainsController (line 302), add the stopId. (Get from frontend.)

    // Get Realtime Stop Monitoring via mtcService. Filter to just get ones that are delayed more than X mins (5? 10?). Arrivals? Departures?
    // For each delayed train, get the WatchedTrain object from Mongo.
    // For each user on each delayed WatchedTrain, check if there's an alert for them. 
    // If yes, check if different, and if so, update it.
    // If no, create alert and notify user.
}

module.exports = weekdayCaltrainMonitoring;