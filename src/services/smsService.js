const accountSid = process.env.SMS_SERVICE_ACCOUNT_SID;
const authToken = process.env.SMS_SERVICE_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const debug = require('debug')('app:smsService');

const fromPhoneNumber = process.env.SMS_SERVICE_FROM_PHONE_NUMBER;

const smsService = () => {

    const sendSMSNotificationToUser = async (recipientPhoneNumber, message) => {
        return new Promise((resolve, reject) => {
            client.messages
                .create({
                    body: message,
                    from: fromPhoneNumber,
                    to: recipientPhoneNumber
                })
                .then(message => {
                    debug('text sent:', message.sid);
                    resolve(message.sid);
                })
                .catch(err => {
                    debug('[Twilio Error]:', err);
                    reject(null);
                })
        });
    };

    return { sendSMSNotificationToUser };
}

module.exports = smsService();