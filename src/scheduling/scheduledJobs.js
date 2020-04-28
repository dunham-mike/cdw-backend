// const debug = require('debug')('app:scheduledJobs');
const schedule = require('node-schedule');
// const moment = require('moment-timezone');
const weekdayCaltrainMonitoring = require('./jobs/weekdayCaltrainMonitoring');

const runScheduledJobs = () => {
    kickoffCaltrainDelayMonitoring();
}

const kickoffCaltrainDelayMonitoring = () => {

    // For testing -- TODO: remove this when feature is complete
    // const caltrainTestingRule = new schedule.RecurrenceRule();
    // caltrainTestingRule.dayOfWeek = 0; 
    // caltrainTestingRule.minute = new schedule.Range(0, 59, 1);
    // const testingCaltrainMonitoringJob = schedule.scheduleJob(caltrainTestingRule, weekdayCaltrainMonitoring);

    // Monday: 4 am to 11:59 pm, to ignore any late Sunday trains
    const caltrainMondayRule = new schedule.RecurrenceRule();
    caltrainMondayRule.dayOfWeek = 1;
    caltrainMondayRule.hour = new schedule.Range(4, 23);
    caltrainMondayRule.minute = new schedule.Range(0, 59, 5);
    const mondayCaltrainMonitoringJob = schedule.scheduleJob(caltrainMondayRule, weekdayCaltrainMonitoring);

    // Tuesday-Friday: 12:00 am to 11:59 pm
    const caltrainTuesdayThroughFridayRule = new schedule.RecurrenceRule();
    caltrainTuesdayThroughFridayRule.dayOfWeek = new schedule.Range(2, 5);
    // No hour rule, because last train arrives in San Jose at 1:42 am and leaves San Jose at 4:28 am. Cleaner to run all day long.
    caltrainTuesdayThroughFridayRule.minute = new schedule.Range(0, 59, 1); // TODO: Change back to 5
    const tuesdayThroughFridayCaltrainMonitoringJob = schedule.scheduleJob(caltrainTuesdayThroughFridayRule, weekdayCaltrainMonitoring);

    // Saturday Morning: 12:00 am to 2:59 am, to finish Friday's schedule
    const caltrainSaturdayRule = new schedule.RecurrenceRule();
    caltrainSaturdayRule.dayOfWeek = 6;
    caltrainSaturdayRule.hour = new schedule.Range(0, 2); // Starts at 4 am on Mondays, to ignore any late Sunday trains
    caltrainSaturdayRule.minute = new schedule.Range(0, 59, 5);
    const saturdayCaltrainMonitoringJob = schedule.scheduleJob(caltrainSaturdayRule, weekdayCaltrainMonitoring);
}

module.exports = runScheduledJobs;