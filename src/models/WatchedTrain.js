const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
// const crypto = require('crypto');
// const jwt = require('jsonwebtoken');

// const secret = process.env.JWT_SECRET;

const WatchedTrainSchema = new mongoose.Schema({
    operator: {
        type: String,
        required: true,
    },
    scheduleType: {
        type: String, 
        required: true,
        enum: ['Weekday', 'Weekend'],
    },
    active: {
        type: Boolean,
        required: true,
        default: true,
    },
    trainInfo: {
        station: {
            type: String,
            required: true,
        },
        direction: {
            type: String,
            required: true,
            enum: ['NB', 'SB'],
        },
        time: {
            type: String,
            required: true,
        },
        trainNumber: {
            type: String,
            required: true,
        },
    }
}, {timestamps: true});

// UserSchema.methods.setPassword = function(password){
//     this.salt = crypto.randomBytes(16).toString('hex');
//     this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
// }

// UserSchema.methods.validPassword = function(password){
//     const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');

//     return this.hash === hash;
// }

// UserSchema.methods.generateJWT = function(){
//     const today = new Date();
//     const exp = new Date(today);
//     exp.setDate(today.getDate() + 30);

//     return jwt.sign({
//         id: this._id,
//         email: this.email,
//         exp: parseInt(exp.getTime() / 1000),
//     }, secret);
// }

// UserSchema.methods.toAuthJSON = function(){
//     return {
//         email: this.email,
//         token: this.generateJWT()
//     }
// }

// UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});

module.exports = WatchedTrain = mongoose.model('watched-train', WatchedTrainSchema);