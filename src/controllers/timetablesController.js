const debug = require('debug')('app:timetablesController');
const Timetables = require('../models/Timetables');

const timetablesController = () => {
    const getCaltrainWeekdayTimetables = async (req, res) => {
        debug('get request on /timetables/caltrain/weekday');

        Timetables.findOne().sort({updated_date: -1})
            .then(timetables => {
                res.json(timetables);
            })
            .catch(error => {
                debug('[MongooseDB]', error);
                res.status(404).json({ no_timetables_found: 'Unable to retrieve timetables' });
            });
    }

    return { getCaltrainWeekdayTimetables };
};

module.exports = timetablesController;