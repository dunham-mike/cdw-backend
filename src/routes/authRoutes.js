const express = require('express');
const authController = require('../controllers/authController');

// const jwt = require('express-jwt');

const authRouter = express.Router();
// const secret = process.env.JWT_SECRET;

const router = () => {
    const { createUserAccount, login } = authController();

    authRouter.route('/create-account')
        .post(createUserAccount);

    authRouter.route('/login')
        .post(login);

    return authRouter;
}

module.exports = router;