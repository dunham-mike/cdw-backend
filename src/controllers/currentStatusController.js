const debug = require('debug')('app:currentStatusController');

const currentStatusController = () => {
    const getCurrentStatus = async (req, res) => {
        debug('get request on /current-status');

        res.send('Current Status will be returned here.');
    }
    
    return { getCurrentStatus };
}

module.exports = currentStatusController;