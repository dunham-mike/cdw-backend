const debug = require('debug')('app:watchedTrainsController');
const User = require('../models/User');
const WatchedTrain = require('../models/WatchedTrain');

const watchedTrainsController = () => {
    const getWatchedTrains = (req, res) => {
        debug('get request on /watched-trains');

        res.send('Get Watched Trains here');

        /* 
            Load am/pm trains watched for this user and token
            Required Parameters:
                User
                Token
        */
    }

    const addOrUpdateWatchedTrain = async (req, res) => {
        debug('post request on /watched-trains');

        const userId = req.user.id;
        const commuteType = req.body.commuteType;
        const trainInfo = req.body.trainInfo;

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
            Parameters format (all required):
                {
                    "commuteType": "AM",
                    "trainInfo" : {
                        "operator": "Caltrain",
                        "scheduleType": "Weekday",
                        "station": "Burlingame",
                        "direction": "NB",
                        "time": "8:08 am",
                        "trainNumber": "207"
                    }
                }
        */
    }

    return { getWatchedTrains, addOrUpdateWatchedTrain };
};


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
    const existingWatchedTrainObject = await getExistingWatchedTrain(userObject, commuteType);

    if (!isUpdateActualChange(existingWatchedTrainObject, trainInfo)) {
        const errorMessage = 'Watched Train did not update. Existing Watched Train matches new Watched Train provided.';
        throw new Error(errorMessage);
    };
    const newWatchedTrainObject = await getNewWatchedTrainOrCreateIt(trainInfo);

    return { userObject, existingWatchedTrainObject, newWatchedTrainObject };
}

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

const confirmAppDataExistsForUserOrAddIt = (userObject) => {
    if(!userObject.appData) {
        userObject.appData = {
            amWatchedTrain: null,
            pmWatchedTrain: null,
            alerts: null
        }
    }
}

const getExistingWatchedTrain = async (userObject, commuteType) => {
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
                        resolve(watchedTrain);
                    } else {
                        throw new Error('Could not find a WatchedTrain for this WatchedTrainId.');
                        reject(err);
                    }
                })
                .catch((err) => {
                    debug(err);
                    reject(err);
                })
        }
    });
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