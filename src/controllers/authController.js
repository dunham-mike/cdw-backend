const debug = require('debug')('app:authController');
const User = require('../models/User');
const passport = require('passport');

const authController = () => {
    const createUserAccount = (req, res) => {
        debug('post request on /api/auth/create-account');

        passport.authenticate('create-account', (err, user) => {            
            if(err) {
                debug(err);
                res.send('Error creating new user.');
            } else {
                res.send('Account successfully created.');
            }
        })(req, res);
    }

    const login = (req, res) => {
        debug('post request on /api/auth/login');
        debug(req.body);

        passport.authenticate('login', (err, user) => {
            if(err) {
                debug('err:', err);
                res.send(err);
            } else {
                res.json(user.toAuthJSON());
            }
        })(req, res);
    }

    return { createUserAccount, login };
};

module.exports = authController;