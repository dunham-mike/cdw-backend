const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const User = mongoose.model('user');
const debug = require('debug')('app:passport');

// import bcrypt from 'bcrypt';

// const BCRYPT_SALT_ROUNDS = 12;

passport.use('create-account', new LocalStrategy({
    usernameField: 'user[email]',
    passwordField: 'user[password]'
}, (email, password, done) => {
    try {
        debug('trying create-account');
        User.findOne({
            where: {
                email: email,
            },
        }).then(user => {
            if(user !== null) {
                debug('email address already registered');
                return done(null, false, { message: 'email address is already registered '});
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
    User.findOne({ email: email })
        .then((user) => {
            if(!user || !user.validPassword(password)) {
                return done(null, false, { errors: { 'email or password' : 'is invalid' }});
            }

            return done(null, user);
        })
        .catch(done);
}));



// const passport = require('passport');

// module.exports = passportConfig = (app) => {
//     app.use(passport.initialize());
//     app.use(passport.session());

//     // Stores user in session
//     passport.serializeUser((user, done) => {
//         done(null, user);
//     });

//     // Retrieves user from session
//     passport.deserializeUser((user, done) => {
//         done(null, user);
//     });

//     require('./strategies/local.strategy');
// }