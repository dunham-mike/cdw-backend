const express = require('express');
const authController = require('../controllers/authController');

// const jwt = require('express-jwt');

const authRouter = express.Router();
// const secret = process.env.JWT_SECRET;

const router = () => {
    const { createUserAccount } = authController();

    authRouter.route('/create-account')
        .post(createUserAccount);

    return authRouter;
}

module.exports = router;