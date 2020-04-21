const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const User = mongoose.model('user');
const debug = require('debug')('app:passport');

passport.use('create-account', new LocalStrategy({
    usernameField: 'user[email]',
    passwordField: 'user[password]'
}, (email, password, done) => {
    try {
        debug('trying create-account');
        debug('email:', email);
        debug('password:', password);
        User.findOne({ email: email })
            .then(user => {
                debug('userResult:', user);
                if(user !== null) {
                    debug('Email address already registered');
                    return done('Email address is already registered');
                } else {
                    debug('trying to create a User in Mongo!');
                    const newUser = new User();
                    newUser.email = email;
                    newUser.setPassword(password);
                    newUser.save();
                    debug('user created');
                    return done(null, newUser);
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