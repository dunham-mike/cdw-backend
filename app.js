const express = require('express');
require('dotenv').config();
const debug = require('debug')('app');
const connectDB = require('./config/db');

const app = express();
const port = process.env.PORT || 8082;

connectDB();

const adminRouter = require('./src/routes/adminRoutes')();

app.use('/admin', adminRouter);
app.get('/', (req, res) => res.send('My backend server!'));

app.listen(port, () => debug(`Server running on port ${port}`));