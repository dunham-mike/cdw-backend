const express = require('express');
const adminController = require('../controllers/adminController');

const adminRouter = express.Router();

const router = () => {
    const { updateOperatorTimetables } = adminController();

    adminRouter.route('/update-timetables')
        .get(updateOperatorTimetables);

    return adminRouter;
}

module.exports = router;