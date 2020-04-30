const accountSid = process.env.SMS_SERVICE_ACCOUNT_SID;
const authToken = process.env.SMS_SERVICE_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const debug = require('debug')('app:smsService');

const fromPhoneNumber = process.env.SMS_SERVICE_FROM_PHONE_NUMBER;
const toPhoneNumber = process.env.SMS_SERVICE_TO_TESTING_PHONE_NUMBER;

const smsService = () => {

    const sendSMSNotificationToUser = async (user) => {
        await client.messages
            .create({
                body: 'Testing Caltrain Delay Watch SMS messages!',
                from: fromPhoneNumber,
                to: toPhoneNumber
            })
            .then(message => {
                debug('text sent:', message.sid);
            });
    };

    return { sendSMSNotificationToUser };
}

module.exports = smsService();