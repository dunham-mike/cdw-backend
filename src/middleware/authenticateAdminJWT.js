const debug = require('debug')('app:authenticateAdminJWT');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = mongoose.model('user');

const accessTokenSecret = process.env.JWT_SECRET;

const authenticateAdminJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, accessTokenSecret, (err, user) => {
            if(err) {
                return res.sendStatus(403);
            } 

            User.findOne({ id: user._id })
                .then((fullUserInfo) => {
                    if(!fullUserInfo || fullUserInfo.role !== 'admin') {
                        debug('No admin role -- unauthorized');
                        return res.sendStatus(403);
                    } else {
                        req.user = user;
                        next();
                    }
                })
                .catch((err) => {
                    return res.sendStatus(403);
                })
        });
    } else {
        res.sendStatus(401);
    }
}

module.exports = authenticateAdminJWT;