const express = require('express');
const userDataController = require('../controllers/userDataController');

const userDataRouter = express.Router();

const router = () => {
    const { getUserData, clearWatchedTrain, addOrUpdateWatchedTrain } = userDataController();

    userDataRouter.route('/')
        .get(getUserData)
        .delete(clearWatchedTrain)
        .post(addOrUpdateWatchedTrain);

    return userDataRouter;
}

module.exports = router;