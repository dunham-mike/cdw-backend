const express = require('express');
const authController = require('../controllers/authController');

const authRouter = express.Router();

const router = () => {
    const { createUserAccount, login } = authController();

    authRouter.route('/create-account')
        .post(createUserAccount);

    authRouter.route('/login')
        .post(login);

    return authRouter;
}

module.exports = router;