const express = require('express');
require('dotenv').config();
const debug = require('debug')('app');
const connectDB = require('./config/db');

const app = express();
const port = process.env.PORT || 8082;

connectDB();

const adminRouter = require('./src/routes/adminRoutes')();
const timetablesRouters = require('./src/routes/timetablesRoutes')();

app.use('/admin', adminRouter);
app.use('/api/timetables', timetablesRouters);
app.get('/', (req, res) => res.send('My backend server!'));

app.listen(port, () => debug(`Server running on port ${port}`));