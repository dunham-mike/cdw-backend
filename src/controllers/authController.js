const debug = require('debug')('app:authController');
const User = require('../models/User');
const passport = require('passport');

const authController = () => {
    const createUserAccount = (req, res, next) => {
        debug('post request on /api/auth/create-account');
        debug(req.body);

        passport.authenticate('create-account', (err, user, info) => {
            debug('err:', err);
            debug('user:', user);
            debug('info:', info);
            res.send('user created!');
        })(req, res, next);

        // res.send('tada!');

        

        // Timetables.findOne().sort({updated_date: -1})
        //     .then(timetables => {
        //         debug(timetables);
        //         res.json(timetables);
        //     })
        //     .catch(error => {
        //         debug('[MongooseDB]', error);
        //         res.status(404).json({ no_timetables_found: 'Unable to retrieve timetables' });
        //     });
    }

    return { createUserAccount };
};

module.exports = authController;