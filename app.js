const express = require('express');
require('dotenv').config();
const debug = require('debug')('app');
const cors = require('cors');
const passport = require('passport');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const favicon = require('serve-favicon');

const connectDB = require('./src/config/db');
require('./src/models/User');
require('./src/config/passport');
const authenticateJWT = require('./src/middleware/authenticateJWT');
const authenticateAdminJWT = require('./src/middleware/authenticateAdminJWT');
const runScheduledJobs = require('./src/scheduling/scheduledJobs');

const app = express();
const port = process.env.PORT || 8082;
process.env.TZ = 'America/Los_Angeles'; // To make sure alert monitoring runs on the right days of the week, regardless of server time zone

connectDB();
runScheduledJobs();

app.use(cors({ origin: true, credentials: true }));
app.use(passport.initialize());
app.use(favicon(__dirname + '/favicon.ico'));
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const adminRouter = require('./src/routes/adminRoutes')();
const authRouter = require('./src/routes/authRoutes')();
const timetablesRouter = require('./src/routes/timetablesRoutes')();
const userDataRouter = require('./src/routes/userDataRoutes')();
const currentStatusRouter = require('./src/routes/currentStatusRoutes')();

app.use('/api/admin', authenticateAdminJWT, adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/timetables', authenticateJWT, timetablesRouter);
app.use('/api/user-data', authenticateJWT, userDataRouter);
app.use('/api/current-status', authenticateJWT, currentStatusRouter)
app.get('/', (req, res) => res.send('Caltrain Delay Watch backend server'));

app.listen(port, () => debug(`Server running on port ${port}`));