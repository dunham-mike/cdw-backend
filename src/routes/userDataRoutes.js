const express = require('express');
const userDataController = require('../controllers/userDataController');

const userDataRouter = express.Router();

const router = () => {
    const { getUserData, clearWatchedTrain, addOrUpdateWatchedTrain, updateUserPreferences } = userDataController();

    userDataRouter.route('/')
        .get(getUserData)
        .delete(clearWatchedTrain)
        .post(addOrUpdateWatchedTrain);

    userDataRouter.route('/preferences')
        .post(updateUserPreferences);

    return userDataRouter;
}

module.exports = router;