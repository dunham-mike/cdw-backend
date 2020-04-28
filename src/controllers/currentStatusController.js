const debug = require('debug')('app:currentStatusController');
const CurrentStatus = require('../models/CurrentStatus');

const currentStatusController = () => {
    const getCurrentStatus = async (req, res) => {
        debug('get request on /current-status');

        CurrentStatus.findOne().sort({createdAt: -1})
            .then(currentStatus => {
                debug(currentStatus);
                res.json(currentStatus);
            })
            .catch(error => {
                debug('[MongooseDB]', error);
                res.status(404).json({ no_current_status_found: 'Unable to retrieve current status' });
            });
    }
    
    return { getCurrentStatus };
}

module.exports = currentStatusController;