const debug = require('debug')('app:weekdayCaltrainMonitoring');
const moment = require('moment-timezone');
const transitDataService = require('../../services/mtcService');
const smsService = require('../../services/smsService');
const WatchedTrain = require('../../models/WatchedTrain');
const CurrentStatus = require('../../models/CurrentStatus');
const User = require('../../models/User');

const operator = "Caltrain";
const operatorId = "CT";
const scheduleType = "Weekday";

const NOTIFICATION_BACKWARD_LOOKING_PERIOD_IN_MINS = 30;
const NOTIFICATION_FORWARD_LOOKING_PERIOD_IN_MINS = 90;
const MINIMUM_MINUTES_LATE_FOR_NOTIFICATION = 10;

const weekdayCaltrainMonitoring = async (schedule) => {
    debug('--------------------------------------------------------');
    debug('Monitor Caltrain Delays here! The time is:', moment().tz("America/Los_Angeles").format('h:mm a') );
    debug('Schedule:', schedule.scheduledJobs);
    debug('Schedule type:', typeof(schedule.scheduledJobs));
    // TODO: Fix issue where accumulated jobs run all at once and get a 429 error from the stopMonitoring API

    // Overall Algorithm:
    // Get all the WatchedTrain objects that were scheduled to depart within the last 30 mins or in the next 90 mins.
    // For the unique list of stopIds, call the transit data service's API to get the latest expected departure data.
    // Loop through all monitored stops returned. 
        // For each monitored stop, loop through each MonitoredStopVisit.
            // For the MonitoredStopVisit, add current status to a currentStatus object. 
            // If arrival or departure is late, add to a lateTrains object.
    // Place new currentStatus object in database, representing the status of all trains being monitored.
    // Then notify users of late trains. That algorithm summarized in notifyUsersOfLateTrains().

    try {
        const trainsToMonitor = await getWatchedTrainsForMonitoring(NOTIFICATION_BACKWARD_LOOKING_PERIOD_IN_MINS, NOTIFICATION_FORWARD_LOOKING_PERIOD_IN_MINS);
        const stopIdsToMonitor = getStopIdsForTrainsToMonitor(trainsToMonitor);
        const stopMonitoringAPIResults = await getUpdatedStopMonitoringData(stopIdsToMonitor);
        const [currentStatusArray, lateTrainsArray ] = processStopMonitoringData(stopMonitoringAPIResults, MINIMUM_MINUTES_LATE_FOR_NOTIFICATION);

        await addCurrentStatusToDatabase(currentStatusArray);

        if(lateTrainsArray.length > 0) {
            await notifyUsersOfLateTrains(lateTrainsArray, trainsToMonitor);
        }
        debug('Monitoring Job Complete');
        
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
                const watchedTrainsWithUsers = watchedTrains.filter(train => Object.keys(train.usersWatching).length > 0);

                if(watchedTrainsWithUsers.length > 0) {
                    resolve(watchedTrainsWithUsers);
                } else {
                    debug(`No WatchedTrains scheduled to leave within the last ${backwardLookingMins} mins or the next ${forwardLookingMins} mins:`, watchedTrains);
                    resolve([]);
                }
            })
            .catch((err) => {
                debug('queryBeginningTime:', queryBeginningTime);
                debug('queryEndTime:', queryEndTime);
                debug('operator:', operator);
                debug('scheduleType:', scheduleType);
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
        // debug('stopId:', thisStopId);

        try {
            const getStopMonitoringAPIResult = await transitDataService.getStopMonitoring(operatorId, thisStopId);
            const stopMonitoringResultString = getStopMonitoringAPIResult.slice(1);
            const stopMonitoringResultObject = JSON.parse(stopMonitoringResultString)
            stopMonitoringAPIResults[thisStopId] = stopMonitoringResultObject
        } catch(err) {
            debug('stopIdsObject:', stopIdsObject);
            debug(err);
            reject(err);
        }
    }

    return stopMonitoringAPIResults;
}

const processStopMonitoringData = (stopMonitoringAPIResults, minimumMinutesLateForNotification) => {
    const stopIds = Object.keys(stopMonitoringAPIResults);
    const currentStatusArray = [];
    const lateTrainsArray = [];

    for(let i=0; i<stopIds.length; i++) {
        const stopId = stopIds[i];
        const monitoredStopsArray = stopMonitoringAPIResults[stopId].ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit;

        for(let j=0; j<monitoredStopsArray.length; j++) {
            const monitoredStop = monitoredStopsArray[j];
            const thisStopStatusObject = getStopStatusObjectFromMonitoredStop(monitoredStop, stopId);
            // Validating the stopStatusObject is necessary because the transit API seems to leave train numbers as null when it first begins to report on a train's status
            const stopStatusObjectIsValid = isStopStatusValid(thisStopStatusObject); 

            if(stopStatusObjectIsValid) {
                currentStatusArray.push(thisStopStatusObject);

                if(thisStopStatusObject.minutesLate >= minimumMinutesLateForNotification) {
                    lateTrainsArray.push(thisStopStatusObject);
                }
            }
        }
    }

    return [currentStatusArray, lateTrainsArray];
}

const isStopStatusValid = (stopStatusObject) => {
    return (
        stopStatusObject.stopId !== null 
        && stopStatusObject.station !== null 
        && stopStatusObject.direction !== null 
        && stopStatusObject.trainNumber !== null 
        && stopStatusObject.scheduledDepartureTime !== null 
        && stopStatusObject.expectedDepartureTime !== null 
        && stopStatusObject.minutesLate !== null && typeof(stopStatusObject.minutesLate) === "number"
        && (stopStatusObject.status === "Late" || stopStatusObject.status === "On Time") 
    );
}

const getStopStatusObjectFromMonitoredStop = (monitoredStop, stopId) => {
    const direction = (monitoredStop.MonitoredVehicleJourney.DirectionRef === "North" ? "NB" : "SB");
    const trainNumber = monitoredStop.MonitoredVehicleJourney.VehicleRef;

    const longStopName = monitoredStop.MonitoredVehicleJourney.MonitoredCall.StopPointName;
    const endStopNameIndex = longStopName.indexOf(" Caltrain");
    const stopName = longStopName.slice(0, endStopNameIndex);

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
    if(minutesLate > 60) {
        debug('arrivalMinutesLate:', arrivalMinutesLate);
        debug('scheduledArrivalTime:', scheduledArrivalTime.toISOString());
        debug('expectedArrivalTime:', expectedArrivalTime.toISOString());
        debug('-----');
        debug('departureMinutesLate:', departureMinutesLate);
        debug('scheduledDepartureTime:', scheduledDepartureTime.toISOString());
        debug('expectedDepartureTime:', expectedDepartureTime.toISOString());
    }

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
    try {
        const newCurrentStatus = new CurrentStatus();
        newCurrentStatus.currentStatuses = currentStatusArray;
        await newCurrentStatus.save()
        debug('CurrentStatus added to database!');
    } catch(err) {
        debug('currentStatusArray:', currentStatusArray);
        debug(err);
    }
}

const notifyUsersOfLateTrains = async (lateTrainsArray, trainsToMonitor) => {
     // Algorithm for notifyUsersOfLateTrains(): 
        // For each late stop, get the corresponding WatchedTrain with the same stopId AND VehicleRef/trainNumber.
            // For each user on each delayed WatchedTrain, check if there's a notification for them for this train, for this day. 
                // If yes, skip.
                // If no, trigger notification for that user and add to user's history.

    try {
        for(let i=0; i<lateTrainsArray.length; i++) {
            const thisLateTrain = lateTrainsArray[i];
            const watchedTrainObject = getMatchingWatchedTrainObjectFromLateTrain(thisLateTrain, trainsToMonitor);
            /* 
                watchedTrainObject may be null in the case where trainsToMonitor looks into trains that departed within the last 
                30 mins but the transit data API no longer returns information on that train (presumably because it left on time).
            */
            if(watchedTrainObject) {
                await notifyUsersOnWatchedTrainObject(watchedTrainObject, thisLateTrain);
            }
        }
    } catch(err) {
        debug('lateTrainsArray:', lateTrainsArray);
        debug('trainsToMonitor:', trainsToMonitor);
        debug(err);
    }
    
}

const getMatchingWatchedTrainObjectFromLateTrain = (lateTrain, trainsToMonitor) => {
    let watchedTrain = null;

    for(let j=0; j<trainsToMonitor.length; j++) {
        const potentialMatchingWatchedTrain = trainsToMonitor[j];

        if(potentialMatchingWatchedTrain.trainInfo.station === lateTrain.station
            && potentialMatchingWatchedTrain.trainInfo.stopId === lateTrain.stopId
            && potentialMatchingWatchedTrain.trainInfo.direction === lateTrain.direction
            && moment(potentialMatchingWatchedTrain.trainInfo.time).format('h:mm a') === moment(lateTrain.scheduledDepartureTime).format('h:mm a')
            && potentialMatchingWatchedTrain.trainInfo.trainNumber === lateTrain.trainNumber
            && potentialMatchingWatchedTrain.active === true
        ) {
            watchedTrain = potentialMatchingWatchedTrain;
            break;
            }
    }

    return watchedTrain;
}

const notifyUsersOnWatchedTrainObject = async (watchedTrainObject, lateTrain) => {
    const userIdsArray = Object.keys(watchedTrainObject.usersWatching);

    for(let k=0; k<userIdsArray.length; k++) {
        const userId = userIdsArray[k];

        await User.findById(userId)
            .then(async (user) => {
                const notificationsArray = user.appData.notifications;

                if(notificationsArray.length > 0) {
                    const latestNotification = notificationsArray[notificationsArray.length - 1];

                    if(moment(latestNotification.createdAt).tz("America/Los_Angeles").isBefore(moment().tz("America/Los_Angeles"), 'day')
                        || latestNotification.stopId !== lateTrain.stopId 
                        || latestNotification.trainNumber !== lateTrain.trainNumber
                    ) { 
                        if(notificationsArray.length > 1) { // Will need to check two notifications back as well
                            const secondLatestNotification = notificationsArray[notificationsArray.length - 2];
                            if( moment(secondLatestNotification.createdAt).tz("America/Los_Angeles").isBefore(moment().tz("America/Los_Angeles"), 'day')
                                || secondLatestNotification.stopId !== lateTrain.stopId 
                                || secondLatestNotification.trainNumber !== lateTrain.trainNumber
                            ) {
                                await addNotificationForUser(user, lateTrain);
                            }
                        } else { // Only 1 prior notification, which was already compared
                            await addNotificationForUser(user, lateTrain);
                        }
                    }
                } else {
                    await addNotificationForUser(user, lateTrain);
                }   
            })
            .catch((err) => {
                debug('userId:', userId);
                debug('watchedTrainObject:', watchedTrainObject);
                debug('lateTrain:', lateTrain);
                debug(err);
            })
    }
}

const addNotificationForUser = async (user, lateTrain) => {
    debug('Adding a notification for:', user._id);

    const userNotificationObject = {...lateTrain};
    const preferredNotificationMethod = (user.appPreferences ? user.appPreferences.preferredNotificationMethod : null);

    if(preferredNotificationMethod === "sms" && user.appPreferences.phoneNumber) {
    
        const userPhoneNumber = user.appPreferences.phoneNumber;
        const smsMessageId = await sendTrainDelaySMSNotification(userPhoneNumber, lateTrain);

        if(smsMessageId !== null) {
            userNotificationObject.notificationMethod = 'sms';
        } else {
            userNotificationObject.notificationMethod = 'sms error';
        }

        userNotificationObject.notificationDestination = userPhoneNumber; 
        userNotificationObject.notificationMessageId = smsMessageId;
    } else {
        userNotificationObject.notificationMethod = "web app";
    }

    user.appData.notifications.push(userNotificationObject);
    await user.save();
}

const sendTrainDelaySMSNotification = async (recipientPhoneNumber, lateTrain) => {
    const delayMessage = `${lateTrain.direction} Caltrain ${lateTrain.trainNumber} ` 
        + `will be ${(lateTrain.minutesLate > 180 ? 'TBD' : lateTrain.minutesLate)} mins late ` // Cuts off above 180 mins, due to occasionally unreliable data from the stopMonitoring API
        + `departing ${lateTrain.station}.\n` 
        + `Expected departure: ${moment.utc(lateTrain.expectedDepartureTime).tz("America/Los_Angeles").format('h:mm a')}\n`
        + `Original departure: ${moment.utc(lateTrain.scheduledDepartureTime).tz("America/Los_Angeles").format('h:mm a')}\n`
        + `More at https://caltrain-delay-watch.web.app/`;

    debug('Calling SMS feature with delayMessage:', delayMessage);
    debug('Message length:', delayMessage.length);
    const messageId = await smsService.sendSMSNotificationToUser(recipientPhoneNumber, delayMessage);
    debug('Done calling SMS feature. messageId:', messageId);

    return messageId;
}

module.exports = weekdayCaltrainMonitoring;