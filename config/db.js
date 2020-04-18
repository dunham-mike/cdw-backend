const mongoose = require('mongoose');
const debug = require('debug');

const connectDB = async () => {
    try {
        await mongoose.connect(
            process.env.MONGODB_URI,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        );
    } catch(err) {
        debug('[MongoDB error]', err.message);
        process.exit(1);
    }

};

module.exports = connectDB;