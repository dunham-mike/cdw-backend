const express = require('express');
const watchedTrainsController = require('../controllers/watchedTrainsController');

const watchedTrainsRouter = express.Router();

const router = () => {
    const { getWatchedTrains, clearWatchedTrain, addOrUpdateWatchedTrain } = watchedTrainsController();

    watchedTrainsRouter.route('/')
        .get(getWatchedTrains)
        .delete(clearWatchedTrain)
        .post(addOrUpdateWatchedTrain);

    return watchedTrainsRouter;
}

module.exports = router;