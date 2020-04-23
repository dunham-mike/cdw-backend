const debug = require('debug')('app:trainsWatchedController');
// const Timetables = require('../models/Timetables');

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

    const addOrUpdateWatchedTrain = (req, res) => {
        debug('post request on /trains-watched');

        res.send('Add or Update Watched Train here');

        /* 
            Update am or pm train for this user and token
            Required Parameters:
                User
                Token
                AM or PM
                New train info
            Notes:
                If appData structure does not exist for user, add it.
                If train does not exist in TrainsWatched, add it.
                API should should check that this is really a change. If not, send back an error message.
        */
    }

    return { getWatchedTrains, addOrUpdateWatchedTrain };
};

module.exports = trainsWatchedController;