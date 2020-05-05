const debug = require('debug')('app:authController');
const passport = require('passport');
const smsService = require('../services/smsService');

const authController = () => {
    const createUserAccount = (req, res) => {
        debug('post request on /api/auth/create-account');

        passport.authenticate('create-account', async (err, user) => {            
            if(err) {
                debug(err);
                res.send('Error creating new user.');
            } else {
                if(user.appPreferences.preferredNotificationMethod === "sms") {
                    const recipientPhoneNumber = user.appPreferences.phoneNumber;
                    const welcomeMessage = `Welcome to Caltrain Delay Watch! Set up your commute to receive a text any time your usual train is running 10 mins or more late.`;
                    const messageId = await smsService.sendSMSNotificationToUser(recipientPhoneNumber, welcomeMessage);
                    debug('Welcome message sent:', messageId);
                }
                
                res.send('Account successfully created.');
            }
        })(req, res);
    }

    const login = (req, res) => {
        debug('post request on /api/auth/login');
        debug(req.body.user.email);

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