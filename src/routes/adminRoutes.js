const express = require('express');
const debug = require('debug')('app:adminRoutes');
const adminController = require('../controllers/adminController');

const adminRouter = express.Router();

const operatorId = 'CT';

const router = () => {
    const { updateOperatorTimetables } = adminController();

    adminRouter.route('/update-timetables')
        .get((req, res) => { 
            debug('get request on /admin/update-timetables');
            res.send('Updating timetables...');
            updateOperatorTimetables(operatorId);
        });

    return adminRouter;
}

module.exports = router;