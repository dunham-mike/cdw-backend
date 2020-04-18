const express = require('express');
const debug = require('debug')('app:adminRoutes');
const adminController = require('../controllers/adminController');

const adminRouter = express.Router();

const router = () => {
    const { updateOperatorTimetables } = adminController();

    adminRouter.route('/update-timetables')
        .get(updateOperatorTimetables);

    return adminRouter;
}

module.exports = router;