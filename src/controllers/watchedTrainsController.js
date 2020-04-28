const debug = require('debug')('app:watchedTrainsController');
const User = require('../models/User');
const WatchedTrain = require('../models/WatchedTrain');
const moment = require('moment-timezone');

const watchedTrainsController = () => {
    const getWatchedTrains = async (req, res) => {
        debug('get request on /watched-trains');

        try {
            const userId = req.user.id;

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
        debug('delete request on /watched-trains');

        // TODO: Set up testing for Node/Mongoose. 
            // Approach:
                // Use mongodb-memory-server to spin up an in-memory database rather than host one locally: https://github.com/nodkz/mongodb-memory-server and https://dev.to/paulasantamaria/testing-node-js-mongoose-with-an-in-memory-database-32np
                // Use NODE_ENV to have mongoose connect to the in-memory database when running tests: https://scotch.io/tutorials/test-a-node-restful-api-with-mocha-and-chai
                // Send HTTP requests with Jest: https://zellwk.com/blog/jest-and-mongoose/
                // Alternately, supertest can send HTTP requests: https://itnext.io/writing-tests-in-your-node-js-api-application-cfb5592df466
            // Resources:
                // Connecting Jest & Mongoose: https://zellwk.com/blog/jest-and-mongoose/
                // Mocha: https://blog.bitsrc.io/build-a-unit-testing-suite-with-mocha-and-mongoose-eba06c3b3625
                // In-memory database: https://dev.to/paulasantamaria/testing-node-js-mongoose-with-an-in-memory-database-32np
                // Node API: https://itnext.io/writing-tests-in-your-node-js-api-application-cfb5592df466
                // Node API: https://scotch.io/tutorials/test-a-node-restful-api-with-mocha-and-chai
        // TODO: Refactor correct parameters functions into checkDeleteParameters and checkPostParameters that throw errors themselves.
        // TODO: Refactor delete function to use helpers to get data.
        // TODO: Create a saveMongooseObjects() function that takes an array of objects and saves them. Then refactor update and delete to use this function explicitly in the main try catch.
        // TODO: Refactor error messages to have statusCode and message.

        try {
            const userId = req.user.id;
            const commuteType = req.body.commuteType;

            if(!clearHasCorrectParameters(commuteType)) {
                throw new Error('Request body does not have expected data.')
            }

            const userObject = await getUserObjectByUserId(userId);

            const existingWatchedTrainObject = await getExistingWatchedTrainForUser(userObject, commuteType);
            if(existingWatchedTrainObject === null) {
                throw new Error('User does not have an existing Watched Train for this commute type.')
            }

            clearExistingWatchedTrainForUser(userObject, existingWatchedTrainObject, commuteType);

            userObject.save();
            existingWatchedTrainObject.save();

            res.send('Watched Train successfully cleared.');
        } catch(err) {
            debug(err.message);
            if(err.message === 'Request body does not have expected data.'
                || err.message === 'User does not have an existing Watched Train for this commute type.'
            ) {
                    res.status(400).send(err.message);
                } else {
                    res.sendStatus(500);
                }
        }

        /* 
            API: Clear AM or PM train for this token's user.
            Authorization: Bearer token
            Parameters (all required):
                {
                    "commuteType": "AM", // or "PM"
                }
        */
    }

    const addOrUpdateWatchedTrain = async (req, res) => {
        debug('post request on /watched-trains');

        try {
            const userId = req.user.id;
            const commuteType = req.body.commuteType;
            const trainInfo = req.body.trainInfo;

            if(!updateHasCorrectParameters(commuteType, trainInfo)) {
                throw new Error('Request body does not have expected data.')
            }

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
            if(err.message === 'Watched Train did not update. Existing Watched Train matches new Watched Train provided.'
                || err.message === 'Request body does not have expected data.'
            ) {
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
                        "time": "8:08 am", // Will be converted to a UTC datetime for storage
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

const clearExistingWatchedTrainForUser = (userObject, watchedTrainObject, commuteType) => {
    if(commuteType === "AM") {
        userObject.appData.amWatchedTrain = null;
    } else if(commuteType === "PM") {
        userObject.appData.pmWatchedTrain = null;
    }

    if(watchedTrainObject && watchedTrainObject.usersWatching) {
        debug('usersWatching before:', watchedTrainObject.usersWatching);
        // watchedTrainObject.usersWatching[userObject._id.toString()] = undefined;
        let newUsersWatching = { ...watchedTrainObject.usersWatching };
        delete newUsersWatching[userObject._id.toString()];
        // newUsersWatching[userObject._id.toString()] = undefined;
        watchedTrainObject.usersWatching = newUsersWatching;
        debug('usersWatching after:', watchedTrainObject.usersWatching);
    }
}

/* --- GET Functions --- */

const convertWatchedTrainToOutput = (watchedTrainObject) => {
    let watchedTrainOutput = null;

    if(watchedTrainObject) {
        watchedTrainOutput = (({ operator, scheduleType, trainInfo }) => ({ operator, scheduleType, trainInfo }))(watchedTrainObject);
        // Technique from: https://stackoverflow.com/a/39333479/12881705

        const newTrainInfo = { ...watchedTrainOutput.trainInfo };
        watchedTrainOutput.trainInfo = newTrainInfo;
        watchedTrainOutput.trainInfo.time = moment(watchedTrainOutput.trainInfo.time).tz("America/Los_Angeles").format('h:mm a');
    }

    return watchedTrainOutput;
}

/* --- DELETE Functions --- */

const clearHasCorrectParameters = (commuteType) => {
    if(commuteType !== "AM" && commuteType !== "PM") {
        return false;
    } else {
        return true;
    }
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
            notifications: null
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
        && moment(relevantTrain.time).tz("America/Los_Angeles").format('h:mm a') === trainInfo.time
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
            'trainInfo.stopId': trainInfo.stopId,
            'trainInfo.direction': trainInfo.direction,
            'trainInfo.time': moment('1970-01-01 ' + trainInfo.time),
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
                        stopId: trainInfo.stopId,
                        direction: trainInfo.direction,
                        time: moment('1970-01-01 ' + trainInfo.time),
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
        debug('saving existingWatchedTrainObject');
        await existingWatchedTrainObject.save();
    }
    await userObject.save();
    await newWatchedTrainObject.save();
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
        const newUsersWatching = { ...watchedTrainObject.usersWatching };
        newUsersWatching[userObject._id.toString()] = true;
        watchedTrainObject.usersWatching = newUsersWatching;
    }
}

module.exports = watchedTrainsController;