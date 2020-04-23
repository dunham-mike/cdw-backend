const express = require('express');
const trainsWatchedController = require('../controllers/trainsWatchedController');

const trainsWatchedRouter = express.Router();

const router = () => {
    const { getWatchedTrains, addOrUpdateWatchedTrain } = trainsWatchedController();

    trainsWatchedRouter.route('/')
        .get(getWatchedTrains)
        .post(addOrUpdateWatchedTrain);

    return trainsWatchedRouter;
}

module.exports = router;