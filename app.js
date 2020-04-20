const express = require('express');
require('dotenv').config();
const debug = require('debug')('app');
const connectDB = require('./src/config/db');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
require('./src/models/User');
require('./src/config/passport');
const authenticateJWT = require('./src/middleware/authenticateJWT');
const authenticateAdminJWT = require('./src/middleware/authenticateAdminJWT');
// const jwt = require('jsonwebtoken');

const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8082;

connectDB();

const adminRouter = require('./src/routes/adminRoutes')();
const authRouter = require('./src/routes/authRoutes')();
const timetablesRouters = require('./src/routes/timetablesRoutes')();

app.use(cors({ origin: true, credentials: true }));

app.use(cookieParser());
// app.use(session({ secret: process.env.EXPRESS_SESSION_SECRET })); // TODO: Revise this?

app.use(passport.initialize());

app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api/admin', authenticateAdminJWT, adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/timetables', authenticateJWT, timetablesRouters);
app.get('/', (req, res) => res.send('My backend server!'));

app.listen(port, () => debug(`Server running on port ${port}`));