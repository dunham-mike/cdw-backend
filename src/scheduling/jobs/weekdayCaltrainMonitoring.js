const debug = require('debug')('app:weekdayCaltrainMonitoring');
const moment = require('moment-timezone');
const transitDataService = require('../../services/mtcService');
const WatchedTrain = require('../../models/WatchedTrain');

const operator = "Caltrain";
const operatorId = "CT";
const scheduleType = "Weekday";

const ALERT_BACKWARD_LOOKING_PERIOD_IN_MINS = 30;
const ALERT_FORWARD_LOOKING_PERIOD_IN_MINS = 90;
const MINIMUM_MINUTES_LATE_FOR_ALERT = 5;

const weekdayCaltrainMonitoring = async () => {
    debug('Monitor Caltrain Delays here! The time is:', moment().tz("America/Los_Angeles").format('h:mm a') );

    // NEXT STEP: When creating WatchedTrain object, store time in UTC, so it can be queried.

    // WATCHEDTRAIN-FIRST APPROACH: [done] Get all WatchedTrain from now -30mins to +90mins. [done] Add stopIds to map of stopIds to remove duplicates.
    // [done] For each stopId in map, call API of realtime status. 
        // Loop through all monitored stops returned. If an arrival or departure more than X mins late, proceed. If not, skip to next one.
            // For each late stop, check if there is a corresponding WatchedTrain with the same stopId AND VehicleRef/trainNumber.
                // For each user on each delayed WatchedTrain, check if there's an alert for them. 
                    // If yes, see if it needs to be updated and then do so.
                    // If no, create alert and trigger notification for that user.

    try {
        const trainsToMonitor = await getWatchedTrainsForMonitoring(ALERT_BACKWARD_LOOKING_PERIOD_IN_MINS, ALERT_FORWARD_LOOKING_PERIOD_IN_MINS);
        // debug(trainsToMonitor);

        const stopIdsToMonitor = getStopIdsForTrainsToMonitor(trainsToMonitor);
        // debug(stopIdsToMonitor);

        const stopMonitoringAPIResults = await getUpdatedStopMonitoringData(stopIdsToMonitor);
        // debug('API results:', stopMonitoringAPIResults);

        const [currentStatusArray, lateTrainsArray ] = processStopMonitoringData(stopMonitoringAPIResults, MINIMUM_MINUTES_LATE_FOR_ALERT);
        // debug(currentStatusArray);

        await addCurrentStatusToDatabase(currentStatusArray);
        
    } catch(err) {
        debug(err);
    }

        
}

const getWatchedTrainsForMonitoring = async (backwardLookingMins, forwardLookingMins) => {
    return new Promise((resolve, reject) => {
        const queryBeginningTime = moment('1970-01-01 ' + moment().subtract(backwardLookingMins, 'minutes').format('h:mm a'),
            'YYYY-MM-DD h:mm a');
        const queryEndTime = moment('1970-01-01 ' + moment().add(forwardLookingMins, 'minutes').format('h:mm a'),
            'YYYY-MM-DD h:mm a');

        WatchedTrain.find({
            operator: operator,
            scheduleType: scheduleType,
            active: true,
            'trainInfo.time': {
                    $gte: queryBeginningTime,
                    $lte: queryEndTime
                }
        })
            .then((watchedTrains) => {
                if(watchedTrains.length > 0) {
                    resolve(watchedTrains);
                } else {
                    debug(`No WatchedTrains scheduled to leave within the last ${backwardLookingMins} mins or the next ${forwardLookingMins} mins:`, watchedTrains);
                    resolve([]);
                }
            })
            .catch((err) => {
                debug(err);
                reject(err);
            })
    });
}

const getStopIdsForTrainsToMonitor = (trainsToMonitor) => {
    const stopIdsProcessed = {};

    for(let i=0; i<trainsToMonitor.length; i++) {
        const thisStopid = trainsToMonitor[i].trainInfo.stopId;

        if(!(thisStopid in stopIdsProcessed)) {
            stopIdsProcessed[thisStopid] = true;
        }
    }

    return stopIdsProcessed;
}

const getUpdatedStopMonitoringData = async (stopIdsObject) => {
    const stopMonitoringAPIResults = {};
    const stopIdsArray = Object.keys(stopIdsObject);

    for(let i=0; i<stopIdsArray.length; i++) {
        const thisStopId = stopIdsArray[i];
        debug('stopId:', thisStopId);

        try {
            const getStopMonitoringAPIResult = await transitDataService.getStopMonitoring(operatorId, thisStopId);
            const stopMonitoringResultString = getStopMonitoringAPIResult.slice(1);
            const stopMonitoringResultObject = JSON.parse(stopMonitoringResultString)
            stopMonitoringAPIResults[thisStopId] = stopMonitoringResultObject
        } catch(err) {
            debug(err);
            reject(err);
        }
    }

    return stopMonitoringAPIResults;
}

const processStopMonitoringData = (stopMonitoringAPIResults) => {
    // [done] Loop through all monitored stops returned. 
        // [done] For each monitored stop, loop through each MonitoredStopVisit.
            // [done] For the MonitoredStopVisit, add current status to a currentStatus object. 
            // [done] If arrival or departure is late, add to a lateTrains object.
    // Update currentStatus object on Mongo.
    // Process lateTrains object: 
        // For each late stop, check if there is a corresponding WatchedTrain with the same stopId AND VehicleRef/trainNumber.
            // For each user on each delayed WatchedTrain, check if there's a notification for them for this train, for this day. 
                // If yes, skip.
                // If no, trigger notification for that user and add to user's history.
    
    const stopIds = Object.keys(stopMonitoringAPIResults);
    const currentStatusArray = [];
    const lateTrainsArray = [];

    for(let i=0; i<stopIds.length; i++) {
        const stopId = stopIds[i];
        const monitoredStopsArray = stopMonitoringAPIResults[stopId].ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit;

        for(let j=0; j<monitoredStopsArray.length; j++) {
            const monitoredStop = monitoredStopsArray[j];
            const thisStopStatusObject = getStopStatusObjectFromMonitoredStop(monitoredStop, stopId);

            currentStatusArray.push(thisStopStatusObject);

            if(thisStopStatusObject.minutesLate > 0) {
                lateTrainsArray.push(thisStopStatusObject);
            }
        }
    }

    return [currentStatusArray, lateTrainsArray];
}

const getStopStatusObjectFromMonitoredStop = (monitoredStop, stopId) => {
    const direction = (monitoredStop.MonitoredVehicleJourney.DirectionRef === "North" ? "NB" : "SB");
    const trainNumber = monitoredStop.MonitoredVehicleJourney.VehicleRef;
    const stopName = monitoredStop.MonitoredVehicleJourney.MonitoredCall.StopPointName;

    const scheduledArrivalTime = moment.tz(monitoredStop.MonitoredVehicleJourney.MonitoredCall.AimedArrivalTime, "America/Los_Angeles");
    const expectedArrivalTime = moment.tz(monitoredStop.MonitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime, "America/Los_Angeles");
    const scheduledDepartureTime = moment.tz(monitoredStop.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime, "America/Los_Angeles");
    const expectedDepartureTime = moment.tz(monitoredStop.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime, "America/Los_Angeles");

    let arrivalMinutesLate = expectedArrivalTime.diff(scheduledArrivalTime, 'minutes');
    // When a train is at the origin, expectedArrivalTime is null. scheduledArrivalTime does exist, though.
    if(isNaN(arrivalMinutesLate)) {
        arrivalMinutesLate = 0;
    }
    let departureMinutesLate = expectedDepartureTime.diff(scheduledDepartureTime, 'minutes');
    // When a train is at the destination, there should be no result at all from the API. But check departureMinutesLate just in case.
    if(isNaN(departureMinutesLate)) {
        departureMinutesLate = 0;
    }

    const minutesLate = Math.max(arrivalMinutesLate, departureMinutesLate);

    // TODO: Figure out what a "canceled" train looks like in the API
    const thisStopStatusObject = {
        stopId: stopId,
        station: stopName,
        direction: direction,
        trainNumber: trainNumber,
        scheduledDepartureTime: scheduledDepartureTime,
        expectedDepartureTime: expectedDepartureTime,
        minutesLate: minutesLate,
        status: (minutesLate > 0 ? "Late" : "On Time")
    }

    return thisStopStatusObject;
}

const addCurrentStatusToDatabase = async (currentStatusArray) => {
    debug('Adding to database:', currentStatusArray);
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