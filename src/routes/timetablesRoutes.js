const express = require('express');
const timetablesController = require('../controllers/timetablesController');

const timetablesRouter = express.Router();

const router = () => {
    const { getCaltrainWeekdayTimetables } = timetablesController();

    timetablesRouter.route('/caltrain/weekday')
        .get(getCaltrainWeekdayTimetables);

    return timetablesRouter;
}

module.exports = router;