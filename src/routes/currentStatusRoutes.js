const express = require('express');
const currentStatusController = require('../controllers/currentStatusController');

const currentStatusRouter = express.Router();

const router = () => {
    const { getCurrentStatus } = currentStatusController();

    currentStatusRouter.route('/')
        .get(getCurrentStatus)

    return currentStatusRouter;
}

module.exports = router;