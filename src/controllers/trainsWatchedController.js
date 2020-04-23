const debug = require('debug')('app:trainsWatchedController');
const User = require('../models/User');

const trainsWatchedController = () => {
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

        // Data Needed
        debug(userId);
        debug(commuteType);
        debug(trainInfo.operator);
        debug(trainInfo.scheduleType);
        debug(trainInfo.station);
        debug(trainInfo.direction);
        debug(trainInfo.time);
        debug(trainInfo.trainNumber);
        debug('---firing functions---');

        if(!updateHasCorrectParameters(commuteType, trainInfo)) {
            res.status(400).send('Request body does not have expected data.');
        }

        try {
            const userObject = await getUserObjectByUserId(userId);

            debug('userObject:', userObject);

            await confirmAppDataExistsForUserOrAddIt(userObject);
            debug('appData:', userObject.appData);

            if (!isUpdateActualChange(userObject, commuteType, trainInfo)) {
                const errorMessage = 'Watched Train did not update. Existing Watched Train matches new Watched Train provided.';
                res.status(400).send(errorMessage);
                throw new Error(errorMessage);
            };

            // TODO: Next, create TrainWatched schema
            const trainWatchedObject = await getTrainWatchedOrCreateIt(trainInfo);

            await clearExistingTrainWatchedForUser(userObject, trainWatchedObject, commuteType);

            await addNewTrainWatchedForUser(userObject, trainWatchedObject, commuteType);

            res.send('Watched Train successfully updated.');
        } catch(err) {
            debug(err);
            res.sendStatus(500);
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
                If train does not exist in TrainsWatched, add it.
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

const confirmAppDataExistsForUserOrAddIt = async (userObject) => {
    return new Promise(async (resolve, reject) => {
        if(!userObject.appData) {
            userObject.appData = {
                amTrainWatched: {},
                pmTrainWatched: {},
                alerts: []
            }
            debug(userObject);
            await userObject.save();
        }
        resolve();
    });
}

const isUpdateActualChange = (userObject, commuteType, trainInfo) => {
    let relevantTrain = null;
    if(commuteType === "AM") {
        relevantTrain = userObject.appData.amTrainWatched;
    } else if(commuteType === "PM") {
        relevantTrain = userObject.appData.pmTrainWatched;
    }

    if(Object.keys(relevantTrain).length === 0) {
        debug("No existing train for this commuteType.");
        return true;
    }

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

const getTrainWatchedOrCreateIt = async (trainInfo) => {
    debug('confirmTrainExistsInTrainsWatchedCollectionOrAddIt()');
    // TODO: complete this
}

const clearExistingTrainWatchedForUser = async (userObject, trainWatchedObject, commuteType) => {
    debug('clearExistingTrainWatchedForUser()');
    // TODO: complete this
}

const addNewTrainWatchedForUser = async (userObject, trainWatchedObject, commuteType) => {
    debug('addUpdatedTrainWatchedForUserAndInTrainsWatched()');
    // TODO: complete this 
}


module.exports = trainsWatchedController;