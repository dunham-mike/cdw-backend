const debug = require('debug')('app:adminController');
const chalk = require('chalk');
const transitDataService = require('../services/mtcService');
const Timetables = require('../models/Timetables');

const adminController = () => {
    const updateOperatorTimetables = async (operatorId) => {
        debug('calling updateOperatorTimetables() in adminController');

        (async function getTransitData() {
            try {
                const formattedStops = await getFormattedStopsAPIData(operatorId);
                const formattedLines = await getFormattedLinesAPIData(operatorId);
                const weekdayTimetables = await getWeekdayTimetableAPIDataForAllLines(operatorId, formattedLines);
                const stopTimetables = getTimetablesGroupedByStop(weekdayTimetables, formattedStops);

                Timetables.create({
                    operator: 'Caltrain',
                    scheduleType: 'Weekday',
                    timetables: stopTimetables
                })
                    .then(timetable => {
                        debug(timetable);
                        debug(chalk.green('updateOperatorTimetables() complete'));
                    })
                    .catch(error => debug('[MongooseDB]', error));
                
            } catch(err) {
                debug(err);
            }
        }());
    }

    return { updateOperatorTimetables };
}

const getFormattedStopsAPIData = async (operatorId) => {
    const getStopsAPIResult = await transitDataService.getStops(operatorId);
    const stopsResultString = getStopsAPIResult.data.slice(1); // .slice(1) is necessary, because the first character of the data string is empty, which is not valid JSON
    const stopsResultObject = JSON.parse(stopsResultString);
    const stopsResultArray = stopsResultObject.Contents.dataObjects.ScheduledStopPoint;

    const formattedStops = {};
    for(let i=0; i<stopsResultArray.length; i++) {
        const stopId = stopsResultArray[i].id;

        let longStopName = stopsResultArray[i].Name;
        const endStopNameIndex = longStopName.indexOf(" Caltrain");
        const shortenedStopName = longStopName.slice(0, endStopNameIndex);

        formattedStops[stopId] = shortenedStopName;
    }

    return formattedStops;
}

const getFormattedLinesAPIData = async (operatorId) => {
    const getLinesAPIResult = await transitDataService.getLines(operatorId);
    const linesResultString = getLinesAPIResult.data.slice(1);
    const linesResultArray = JSON.parse(linesResultString);

    const formattedLines = {};
    for(let i=0; i<linesResultArray.length; i++) {
        formattedLines[linesResultArray[i].Id] = linesResultArray[i].Name;
    }

    return formattedLines;
}

const getWeekdayTimetableAPIDataForAllLines = async (operatorId, formattedLines) => {
    const lineIdsArray = Object.keys(formattedLines);
    // TODO: expand beyond just weekday timetables
    const weekdayTimetables = {};
    for(let j=0; j<lineIdsArray.length; j++) {
        const lineId = lineIdsArray[j];
        const getTimetablesAPIResult = await transitDataService.getTimetables(operatorId, lineId);
        const timetablesResultString = getTimetablesAPIResult.data.slice(1);
        const timetablesResultObject = JSON.parse(timetablesResultString);
        const timetableFrames = timetablesResultObject.Content.TimetableFrame;
        if(timetableFrames) {
            // TODO: dynamically evaluate which timeframes to include
            for(let k=0; k<timetableFrames.length; k++) {
                if(timetableFrames[k].Name.includes('Year Round Weekday Reduced Service (Weekday)')) {
                    weekdayTimetables[timetableFrames[k].Name] = timetableFrames[k].vehicleJourneys.ServiceJourney;
                }
            }
        }
    }

    return weekdayTimetables;
}

const getTimetablesGroupedByStop = (timetables, formattedStops) => {
    const stopTimetables = {};
    const lineTimetablesArray = Object.keys(timetables);

    for(let l=0; l<lineTimetablesArray.length; l++) {
        const lineTimetableName = lineTimetablesArray[l];
        const trainsArray = timetables[lineTimetableName];
        /* 
        trainsArray is an array of train objects, which individually look like:
            {
                id: '207',
                SiriVehicleJourneyRef: '207',
                JourneyPatternView: { RouteRef: [Object], DirectionRef: [Object] },
                calls: { Call: [Array] }
            },
        */

        for(let m=0; m<trainsArray.length; m++) {
            const trainId = trainsArray[m].id;
            const trainCardinalDirection = trainsArray[m].JourneyPatternView.DirectionRef.ref.trim();
            let trainDirection = null;
            if(trainCardinalDirection === "N") {
                trainDirection = "NB"; // Northbound
            } else if(trainCardinalDirection === "S") {
                trainDirection = "SB";
            }

            const trainStopsArray = trainsArray[m].calls.Call;
            /*
            trainStopsArray is an array of stop objects, which individually look like:
                {
                    order: '1',
                    ScheduledStopPointRef: { ref: '70012' },
                    Arrival: { Time: '00:05:00', DaysOffset: '1' },
                    Departure: { Time: '00:05:00', DaysOffset: '1' }
                },
            */

            for(let n=0; n<trainStopsArray.length; n++) {
                const stopId = trainStopsArray[n].ScheduledStopPointRef.ref;
                const stopName = formattedStops[stopId];

                if( !(stopId in stopTimetables)) {
                    stopTimetables[stopId] = {
                        stationName: stopName,
                        direction: trainDirection,
                        timetable: []
                    }
                }

                const trainObject = {
                    trainNumber: trainId,
                    arrivalTime: trainStopsArray[n].Arrival.Time
                }

                stopTimetables[stopId].timetable.push(trainObject);

                stopTimetables[stopId].timetable.sort((a, b) => {
                    return (a.arrivalTime > b.arrivalTime) ? 1 : -1;
                });
            }
        }
    }

    return stopTimetables;
}

module.exports = adminController;