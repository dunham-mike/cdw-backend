const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const User = mongoose.model('user');
const debug = require('debug')('app:passport');

passport.use('create-account', new LocalStrategy({
    usernameField: 'user[email]',
    passwordField: 'user[password]',
    passReqToCallback: true
}, (req, email, password, done) => {
    try {
        debug('Looking for existing user with email:', email);
        User.findOne({ email: email })
            .then(async (user) => {
                debug('userResult:', user);
                if(user !== null) {
                    debug('Email address already registered.');
                    return done('Email address is already registered.');
                } else {
                    try {
                        debug('Creating user in database');
                        const newUser = new User();

                        newUser.email = email;
                        newUser.setPassword(password);

                        const preferredNotificationMethod = req.body.user.preferredNotificationMethod;
                        newUser.appPreferences = {
                            preferredNotificationMethod: preferredNotificationMethod
                        };
                        if(preferredNotificationMethod === "sms") {
                            newUser.appPreferences.phoneNumber = req.body.user.phoneNumber;
                        };

                        await newUser.save();
                        debug('User successfully created');
                        return done(null, newUser);
                    } catch(err) {
                        done(err);
                    }
                    
                }
            })
    } catch(err) {
        done(err);
    }
}
));

passport.use('login', new LocalStrategy({
    usernameField: 'user[email]',
    passwordField: 'user[password]'
}, (email, password, done) => {
    try {
        User.findOne({ email: email })
        .then((user) => {
            if(!user || !user.validPassword(password)) {
                return done('Email or password is invalid.', false);
            }
            return done(null, user);
        })
    } catch(err) {
        done(err);
    }
}));