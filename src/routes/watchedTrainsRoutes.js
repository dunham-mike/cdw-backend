const express = require('express');
const watchedTrainsController = require('../controllers/watchedTrainsController');

const watchedTrainsRouter = express.Router();

const router = () => {
    const { getWatchedTrains, addOrUpdateWatchedTrain } = watchedTrainsController();

    watchedTrainsRouter.route('/')
        .get(getWatchedTrains)
        .post(addOrUpdateWatchedTrain);

    return watchedTrainsRouter;
}

module.exports = router;