const debug = require('debug')('app:scheduledJobs');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

const runScheduledJobs = () => {
    kickoffCaltrainDelayMonitoring();
}

const kickoffCaltrainDelayMonitoring = () => {
    var caltrainWeekdayRule = new schedule.RecurrenceRule();
    caltrainWeekdayRule.dayOfWeek = new schedule.Range(1, 6); // Monday through Friday // TODO: Need to set end of range to 5
    // No hour rule, because last train arrives in San Jose at 1:42 am and leaves San Jose at 4:28 am. Might as well run all day long.
    caltrainWeekdayRule.minute = new schedule.Range(0, 59, 5);
    
    const weekdayCaltrainMonitoringJob = schedule.scheduleJob(caltrainWeekdayRule, () => {
        debug('Monitor Caltrain Delays here! The time is:', moment(Date.now()).tz("America/Los_Angeles").format('h:mm a') );
    });
}

module.exports = runScheduledJobs;