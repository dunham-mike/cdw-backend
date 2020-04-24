const debug = require('debug')('app:watchedTrainsController');
const User = require('../models/User');
const WatchedTrain = require('../models/WatchedTrain');

const watchedTrainsController = () => {
    const getWatchedTrains = async (req, res) => {
        debug('get request on /watched-trains');

        const userId = req.user.id;

        try {
            const userObject = await getUserObjectByUserId(userId);
            const amWatchedTrain = await getExistingWatchedTrainForUser(userObject, "AM");
            const pmWatchedTrain = await getExistingWatchedTrainForUser(userObject, "PM");

            const amWatchedTrainOutput = convertWatchedTrainToOutput(amWatchedTrain, "AM");
            const pmWatchedTrainOutput = convertWatchedTrainToOutput(pmWatchedTrain, "PM");
            res.json({
                amWatchedTrain: amWatchedTrainOutput,
                pmWatchedTrain: pmWatchedTrainOutput
            })
        } catch(err) {
            debug(err.message);
            res.sendStatus(500);
        }

        /* 
            API: Load AM/PM trains watched for this token's user.
            Authorization: Bearer token
            Parameters: (none)
        */
    }

    const clearWatchedTrain = async (req, res) => {
        res.send('Clear Watched Train here.');
    }

    const addOrUpdateWatchedTrain = async (req, res) => {
        debug('post request on /watched-trains');

        const userId = req.user.id;
        const commuteType = req.body.commuteType;
        const trainInfo = req.body.trainInfo;

        // TODO: Allow clearing of WatchedTrain

        if(!updateHasCorrectParameters(commuteType, trainInfo)) {
            res.status(400).send('Request body does not have expected data.');
        }

        try {
            const { userObject, existingWatchedTrainObject, newWatchedTrainObject } 
                = await prepareUserAndTrainObjects(userId, commuteType, trainInfo);
            await updateExistingAndNewWatchedTrains(userObject, existingWatchedTrainObject, newWatchedTrainObject, commuteType);

            debug('---userObject---');
            debug(userObject);
            debug('---existingTrainObject---');
            debug(existingWatchedTrainObject);
            debug('---newTrainObject---');
            debug(newWatchedTrainObject);

            res.send('Watched Train successfully updated.');
        } catch(err) {
            debug(err.message);
            if(err.message === 'Watched Train did not update. Existing Watched Train matches new Watched Train provided.') {
                res.status(400).send(err.message);
            } else {
                res.sendStatus(500);
            }
        }
        
        /* 
            API: Update AM or PM train for this token's user.
            Authorization: Bearer token
            Parameters (all required):
                {
                    "commuteType": "AM", // or "PM"
                    "trainInfo" : {
                        "operator": "Caltrain", // Only operator supported now
                        "scheduleType": "Weekday", // Only schedule type supported now
                        "station": "Burlingame", // Must match name in timetables
                        "direction": "NB", // or "SB"
                        "time": "8:08 am",
                        "trainNumber": "207"
                    }
                }
        */
    }

    return { getWatchedTrains, clearWatchedTrain, addOrUpdateWatchedTrain };
};

/* --- Helper Functions --- */

const getUserObjectByUserId = async (userId) => {
    return new Promise((resolve, reject) => {
        User.findById(userId)
            .then((user) => {
                resolve(user);
            })
            .catch((err) => {
                debug(err);
                reject(err);
            })
    });
}

const getExistingWatchedTrainForUser = async (userObject, commuteType) => {
    return new Promise((resolve, reject) => {
        const relevantTrainId = getRelevantAmOrPmTrainIdFromUserObject(userObject, commuteType);

        if(relevantTrainId == null || relevantTrainId == undefined) {
            resolve(null);
        } else {
            WatchedTrain.findOne({
                _id: relevantTrainId
            })
                .then((watchedTrain) => {
                    if(watchedTrain) {
                        if(watchedTrain.active) {
                            resolve(watchedTrain);
                        } else {
                            throw new Error('WatchedTrain for this WatchedTrainId is not active.');
                        }
                    } else {
                        throw new Error('Could not find a WatchedTrain for this WatchedTrainId.');
                    }
                })
                .catch((err) => {
                    debug(err);
                    reject(err);
                })
        }
    });
}

/* --- GET Functions --- */

const convertWatchedTrainToOutput = (watchedTrainObject) => {
    let watchedTrainOutput = null;

    if(watchedTrainObject) {
        watchedTrainOutput = (({ operator, scheduleType, trainInfo }) => ({ operator, scheduleType, trainInfo }))(watchedTrainObject);
        // Technique from: https://stackoverflow.com/a/39333479/12881705
    }

    return watchedTrainOutput;
}

/* --- POST Functions --- */

const updateHasCorrectParameters = (commuteType, trainInfo) => {
    if(commuteType !== "AM" && commuteType !== "PM") {
        return false;
    }

    if(!('operator' in trainInfo
        && 'scheduleType' in trainInfo
        && 'station' in trainInfo
        && 'direction' in trainInfo
        && 'time' in trainInfo
        && 'trainNumber' in trainInfo
    )) {
        return false;
    }

    if(trainInfo.operator !== "Caltrain" || trainInfo.scheduleType !== "Weekday") {
        return false;
    }

    if(trainInfo.direction !== "NB" && trainInfo.direction !== "SB") {
        return false;
    }

    return true;
}

const prepareUserAndTrainObjects = async (userId, commuteType, trainInfo) => {
    const userObject = await getUserObjectByUserId(userId);
    confirmAppDataExistsForUserOrAddIt(userObject);
    const existingWatchedTrainObject = await getExistingWatchedTrainForUser(userObject, commuteType);

    if (!isUpdateActualChange(existingWatchedTrainObject, trainInfo)) {
        const errorMessage = 'Watched Train did not update. Existing Watched Train matches new Watched Train provided.';
        throw new Error(errorMessage);
    };
    const newWatchedTrainObject = await getNewWatchedTrainOrCreateIt(trainInfo);

    return { userObject, existingWatchedTrainObject, newWatchedTrainObject };
}

const confirmAppDataExistsForUserOrAddIt = (userObject) => {
    if(!userObject.appData) {
        userObject.appData = {
            amWatchedTrain: null,
            pmWatchedTrain: null,
            alerts: null
        }
    }
}

const isUpdateActualChange = (existingWatchedTrainObject, trainInfo) => {
    if(existingWatchedTrainObject === null) {
        return true;
    }

    const relevantTrain = existingWatchedTrainObject.trainInfo;

    if(relevantTrain.station === trainInfo.station 
        && relevantTrain.direction === trainInfo.direction 
        && relevantTrain.time === trainInfo.time 
        && relevantTrain.trainNumber === trainInfo.trainNumber 
    ) {
        debug("Existing train matches updated train.");
        return false;
    }

    return true;
}

const getNewWatchedTrainOrCreateIt = async (trainInfo) => {
    return new Promise((resolve, reject) => {
        WatchedTrain.findOne({
            operator: trainInfo.operator,
            scheduleType: trainInfo.scheduleType,
            active: true,
            'trainInfo.station': trainInfo.station,
            'trainInfo.direction': trainInfo.direction,
            'trainInfo.time': trainInfo.time,
            'trainInfo.trainNumber': trainInfo.trainNumber
        })
            .then((watchedTrain) => {
                if(watchedTrain) {
                    resolve(watchedTrain);
                } else {
                    const newWatchedTrain = new WatchedTrain();
                    newWatchedTrain.operator = trainInfo.operator;
                    newWatchedTrain.scheduleType = trainInfo.scheduleType;
                    newWatchedTrain.active = true;
                    newWatchedTrain.usersWatching = null;
                    newWatchedTrain.trainInfo = {
                        station: trainInfo.station,
                        direction: trainInfo.direction,
                        time: trainInfo.time,
                        trainNumber: trainInfo.trainNumber
                    }
                    resolve(newWatchedTrain);
                }
            })
            .catch((err) => {
                debug(err);
                reject(err);
            })
    });
}

const getRelevantAmOrPmTrainIdFromUserObject = (userObject, commuteType) => {
    let relevantTrainId = null;
    if(commuteType === "AM") {
        relevantTrainId = userObject.appData.amWatchedTrain;
    } else if(commuteType === "PM") {
        relevantTrainId = userObject.appData.pmWatchedTrain;
    }

    return relevantTrainId;
}

const updateExistingAndNewWatchedTrains = async (userObject, existingWatchedTrainObject, newWatchedTrainObject, commuteType) => {
    clearExistingWatchedTrainForUser(userObject, existingWatchedTrainObject, commuteType);
    addNewWatchedTrainForUser(userObject, newWatchedTrainObject, commuteType);

    if (existingWatchedTrainObject) {
        existingWatchedTrainObject.save();
    }
    userObject.save();
    newWatchedTrainObject.save();
}

const clearExistingWatchedTrainForUser = (userObject, watchedTrainObject, commuteType) => {
    if(commuteType === "AM") {
        userObject.appData.amWatchedTrain = null;
    } else if(commuteType === "PM") {
        userObject.appData.pmWatchedTrain = null;
    }

    if(watchedTrainObject && watchedTrainObject.usersWatching) {
        watchedTrainObject.usersWatching[userObject._id.toString()] = undefined;
    }
}

const addNewWatchedTrainForUser = (userObject, watchedTrainObject, commuteType) => {
    const watchedTrainObjectId = watchedTrainObject._id;

    if(commuteType === "AM") {
        userObject.appData.amWatchedTrain = watchedTrainObjectId;
    } else if(commuteType === "PM") {
        userObject.appData.pmWatchedTrain = watchedTrainObjectId;
    }

    if (watchedTrainObject.usersWatching === null) {
        watchedTrainObject.usersWatching = {
            [userObject._id.toString()]: true,
        }
    } else {
        watchedTrainObject.usersWatching[userObject._id.toString()] = true;
    }
}

module.exports = watchedTrainsController;