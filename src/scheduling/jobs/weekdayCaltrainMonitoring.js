const debug = require('debug')('app:weekdayCaltrainMonitoring');
// const schedule = require('node-schedule');
const moment = require('moment-timezone');
const transitDataService = require('../../services/mtcService');
const WatchedTrain = require('../../models/WatchedTrain');

const operator = "Caltrain";
const operatorId = "CT";
const scheduleType = "Weekday";
const MINIMUM_MINUTES_LATE_FOR_ALERT = 5;

const weekdayCaltrainMonitoring = async () => {
    debug('Monitor Caltrain Delays here! The time is:', moment().tz("America/Los_Angeles").format('h:mm a') );

    // NEXT STEP: When creating WatchedTrain object, store time in UTC, so it can be queried.

    // WATCHEDTRAIN-FIRST APPROACH: Get all WatchedTrain from now -30mins to +90mins. Add stopIds to map of stopIds to remove duplicates.
    // For each stopId in map, call API of realtime status. Loop through all monitored stops returned.
        // If an arrival or departure more than X mins late, proceed. If not, skip to next one.
            // For each late stop, check if there is a corresponding WatchedTrain with the same stopId AND VehicleRef/trainNumber.
                // For each user on each delayed WatchedTrain, check if there's an alert for them. 
                    // If yes, see if it needs to be updated and then do so.
                    // If no, create alert and trigger notification for that user.

    try {
        const queryBeginningTime = moment().subtract(30, 'minutes');
        const queryEndTime = moment().add(90, 'minutes');

        WatchedTrain.find({
            operator: operator,
            scheduleType: scheduleType,
            active: true,
            trainInfo: {
                time: {
                    $gte: queryBeginningTime,
                    $lte: queryEndTime
                }
            }
        })
            .then((watchedTrains) => {
                if(watchedTrains.length > 0) {
                    debug(watchedTrains);
                } else {
                    debug('No WatchedTrains scheduled to leave within the last 30 mins or the next 90 mins:', watchedTrains);
                }
            })
    } catch(err) {
        debug(err);
    }

        
}

const createOrUpdateAlert = async () => {
    debug('***Creating an alert!***');
}

module.exports = weekdayCaltrainMonitoring;

/* 
    GETTING ALL STOPS RETURNED FROM THE REAL-TIME STOP MONITORING API:

    try {
    // Not using this approach, because the stop monitoring API only returns stops in next 20-30 mins, not all upcoming stops.
            // Calling API with a stopCode parameter shows the next train coming. (NEED TO CHECK ON MONDAY IF THIS WILL SHOW MULTIPLE TRAINS IN THE FUTURE)
        const getStopMonitoringAPIResult = await transitDataService.getStopMonitoring(operatorId);
        const stopMonitoringResultString = getStopMonitoringAPIResult.data.slice(1); // .slice(1) is necessary, because the first character of the data string is empty, which is not valid JSON
        const stopMonitoringResultObject = JSON.parse(stopMonitoringResultString);
        const stopMonitoringArray = stopMonitoringResultObject.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit;

        for(let i=0; i<stopMonitoringArray.length; i++) {
            const line = stopMonitoringArray[i].MonitoredVehicleJourney.LineRef;
            const direction = stopMonitoringArray[i].MonitoredVehicleJourney.DirectionRef;

            const scheduledArrivalTime = moment.tz(stopMonitoringArray[i].MonitoredVehicleJourney.MonitoredCall.AimedArrivalTime, "America/Los_Angeles");
            const expectedArrivalTime = moment.tz(stopMonitoringArray[i].MonitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime, "America/Los_Angeles");
            const scheduledDepartureTime = moment.tz(stopMonitoringArray[i].MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime, "America/Los_Angeles");
            const expectedDepartureTime = moment.tz(stopMonitoringArray[i].MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime, "America/Los_Angeles");
            const stopId = stopMonitoringArray[i].MonitoredVehicleJourney.MonitoredCall.StopPointRef;
            const stopName = stopMonitoringArray[i].MonitoredVehicleJourney.MonitoredCall.StopPointName;

            let arrivalMinutesLate = expectedArrivalTime.diff(scheduledArrivalTime, 'minutes');
            // When a train is at the origin, expectedArrivalTime is null. scheduledArrivalTime does exist, though.
            if(isNaN(arrivalMinutesLate)) {
                arrivalMinutesLate = 0;
            }
            let departureMinutesLate = expectedDepartureTime.diff(scheduledDepartureTime, 'minutes');
            // When a train is at the destination, expectedDepartureTime is null (? need to confirm). scheduledDepartureTime does exist, though (? need to confirm).
            if(isNaN(departureMinutesLate)) {
                departureMinutesLate = 0;
            }

            debug('---' + stopName + '---');
            debug('line:', line);
            debug('direction:', direction);
            debug('stopId:', stopId);
            debug('scheduledArrivalTime:', scheduledArrivalTime.format('h:mm a'));
            debug('expectedArrivalTime:', expectedArrivalTime.format('h:mm a'));
            debug(arrivalMinutesLate)
            debug('scheduledDepartureTime:', scheduledDepartureTime.format('h:mm a'));
            debug('expectedDepartureTime:', expectedDepartureTime.format('h:mm a'));
            debug(departureMinutesLate);

            if(arrivalMinutesLate >= MINIMUM_MINUTES_LATE_FOR_ALERT || departureMinutesLate >= MINIMUM_MINUTES_LATE_FOR_ALERT) {
                await createOrUpdateAlert(
                    stopId, 
                    scheduledArrivalTime,
                    expectedArrivalTime,
                    arrivalMinutesLate,
                    scheduledDepartureTime,
                    expectedDepartureTime,
                    departureMinutesLate);
            }
        }
    } catch(err) {
        debug(err);
    }

    // NEXT: Get Realtime Stop Monitoring via a new mtcService. Filter to just get ones that are delayed more than X mins (5? 10?). Arrivals? Departures?
    // For each delayed train, check if there is a WatchedTrain object in Mongo. If not, skip. If yes, get the WatchedTrain object from Mongo.
    // For each user on each delayed WatchedTrain, check if there's an alert for them. 
    // If yes, check if different, and if so, update it.
    // If no, create alert and notify user.
*/