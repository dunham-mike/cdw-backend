const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

const UserSchema = new mongoose.Schema({
    email: {
        type: String, 
        lowercase: true, 
        unique: true, 
        required: [true, "can't be blank"], 
        match: [/\S+@\S+\.\S+/, 'is invalid'], 
        index: true
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    hash: String,
    salt: String,
    appData: {
        amWatchedTrain: { type: mongoose.ObjectId, default: null },
        pmWatchedTrain: { type: mongoose.ObjectId, default: null },
        alerts: { 
            type: [mongoose.ObjectId], 
            default: null 
        }
    }
}, {timestamps: true});

UserSchema.methods.setPassword = function(password){
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
}

UserSchema.methods.validPassword = function(password){
    const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');

    return this.hash === hash;
}

UserSchema.methods.generateJWT = function(){
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 30);

    return jwt.sign({
        id: this._id,
        email: this.email,
        exp: parseInt(exp.getTime() / 1000),
    }, secret);
}

UserSchema.methods.toAuthJSON = function(){
    return {
        email: this.email,
        token: this.generateJWT()
    }
}

UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});

module.exports = User = mongoose.model('user', UserSchema);