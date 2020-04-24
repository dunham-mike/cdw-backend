const debug = require('debug')('app:watchedTrainsController');
const User = require('../models/User');
const WatchedTrain = require('../models/WatchedTrain');

const watchedTrainsController = () => {
    const getWatchedTrains = (req, res) => {
        debug('get request on /trains-watched');

        res.send('Get Watched Trains here');

        /* 
            Load am/pm trains watched for this user and token
            Required Parameters:
                User
                Token
        */
    }

    const addOrUpdateWatchedTrain = async (req, res) => {
        debug('post request on /trains-watched');

        const userId = req.user.id;
        const commuteType = req.body.commuteType;
        const trainInfo = req.body.trainInfo;

        /* 
            TODO Next Steps:
            - Refactor this big function into stages
        */

        if(!updateHasCorrectParameters(commuteType, trainInfo)) {
            res.status(400).send('Request body does not have expected data.');
        }

        try {
            const userObject = await getUserObjectByUserId(userId);

            debug('userObject:', userObject);

            confirmAppDataExistsForUserOrAddIt(userObject);
            debug('appData:', userObject.appData);

            const existingWatchedTrainObject = await getExistingWatchedTrain(userObject, commuteType);

            if (!isUpdateActualChange(existingWatchedTrainObject, trainInfo)) {
                const errorMessage = 'Watched Train did not update. Existing Watched Train matches new Watched Train provided.';
                throw new Error(errorMessage);
            };

            const newWatchedTrainObject = await getNewWatchedTrainOrCreateIt(trainInfo);

            clearExistingWatchedTrainForUser(userObject, existingWatchedTrainObject, commuteType);

            addNewWatchedTrainForUser(userObject, newWatchedTrainObject, commuteType);

            if (existingWatchedTrainObject) {
                debug('saving existingWatchedTrainObject');
                existingWatchedTrainObject.save();
            }
            userObject.save();
            newWatchedTrainObject.save();

            debug('---existingTrainObject---');
            debug(existingWatchedTrainObject);

            debug('---newTrainObject---');
            debug(newWatchedTrainObject);

            res.send('Watched Train successfully updated.');
        } catch(err) {
            debug(err);
            if(err.message === 'Watched Train did not update. Existing Watched Train matches new Watched Train provided.') {
                res.status(400).send(err.message);
            } else {
                res.sendStatus(500);
            }
        }
        

        /* 
            Update am or pm train for this user and token
            Parameters format:
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
            Required Parameters:
                [n/a - retrieved via token] User
                [done] Token
                commuteType - AM or PM
                trainInfo: 

            Notes:
                If appData structure does not exist for user, add it.
                API should should check that this is really a change. If not, send back an error message.
                If train does not exist in WatchedTrains, add it.
        */
    }

    return { getWatchedTrains, addOrUpdateWatchedTrain };
};

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
        debug('creating appData on userObject');
        userObject.appData = {
            amWatchedTrain: null,
            pmWatchedTrain: null,
            alerts: null
        }
        debug(userObject);
    }
}

const getExistingWatchedTrain = async (userObject, commuteType) => {
    return new Promise((resolve, reject) => {
        const relevantTrainId = getRelevantAmOrPmTrainIdFromUserObject(userObject, commuteType);

        debug('relevantTrainId:', relevantTrainId);

        if(relevantTrainId == null || relevantTrainId == undefined) {
            resolve(null);
        } else {
            WatchedTrain.findOne({
                _id: relevantTrainId
            })
                .then((watchedTrain) => {
                    if(watchedTrain) {
                        debug('existing WatchedTrain found:', watchedTrain);
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
                    debug('watchedTrain found:', watchedTrain);
                    resolve(watchedTrain);
                } else {
                    debug('trying to create a WatchedTrain in Mongo!');
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
                    debug('WatchedTrain created');
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

    debug('relevantTrainId:', relevantTrainId);

    return relevantTrainId;
}

const clearExistingWatchedTrainForUser = (userObject, watchedTrainObject, commuteType) => {
    debug('clearExistingWatchedTrainForUser() before:');
    debug(userObject);
    debug(watchedTrainObject);

    if(commuteType === "AM") {
        userObject.appData.amWatchedTrain = null;
    } else if(commuteType === "PM") {
        userObject.appData.pmWatchedTrain = null;
    }

    if(watchedTrainObject && watchedTrainObject.usersWatching) {
        watchedTrainObject.usersWatching[userObject._id.toString()] = undefined;
    }

    

    debug('clearExistingWatchedTrainForUser() after:');
    debug(userObject);
    debug(watchedTrainObject);
}

const addNewWatchedTrainForUser = (userObject, watchedTrainObject, commuteType) => {
    debug('addNewWatchedTrainForUser()');

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

    debug('Watched Train updated!');
}

module.exports = watchedTrainsController;