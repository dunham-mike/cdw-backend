const debug = require('debug')('app:timetablesController');

const timetablesController = () => {
    const getCaltrainWeekdayTimetables = (req, res) => {
        debug('get request on /timetables/caltrain/weekday');
        res.write('This will return the Caltrain Weekday timetables.');
        res.end();
    }

    return { getCaltrainWeekdayTimetables };
}

module.exports = timetablesController;