const axios = require('axios');
const debug = require('debug')('app:mtcService');

const API_KEY = process.env.MTC_API_KEY;

const mtcService = () => {
    const getStops = (operatorId) => {
        debug('getStops API call');
        return new Promise((resolve, reject) => {
            axios.get(`http://api.511.org/transit/stops?operator_id=${operatorId}&api_key=${API_KEY}`)
                .then((response) => {
                    resolve(response);
                })
                .catch((error) => {
                    reject(error);
                    debug(error);
                });
        });
    }

    const getLines = (operatorId) => {
        debug('getLines API call');
        return new Promise((resolve, reject) => {
            axios.get(`http://api.511.org/transit/lines?operator_id=${operatorId}&api_key=${API_KEY}`)
                .then((response) => {
                    resolve(response);
                })
                .catch((error) => {
                    reject(error);
                    debug(error);
                });
        });
    }

    const getTimetables = (operatorId, lineId) => {
        debug('getTimetables API call');
        return new Promise((resolve, reject) => {
            axios.get(`http://api.511.org/transit/timetable?operator_id=${operatorId}&line_id=${lineId}&api_key=${API_KEY}`)
                .then((response) => {
                    resolve(response);
                })
                .catch((error) => {
                    reject(error);
                    debug(error);
                });
        });
    }

    const getStopMonitoring = (operatorId, stopId) => {
        debug('getStopMonitoring API call');
        /*
            API NOTES: 
            - If called with no stopCode parameter, it will return info on stops in the next 20-30 mins (not clear exactly how long). 
            - If called with a stopCode parameter (e.g., 70081 for the Burlingame Ave. northbound stop), it will return info on stops 
            for at least trains currently running and, it seems, trains beginning their route soon. At 9 am, for instance, it returned 
            a train reaching the Burlingame Ave. northbound stop at 9:33 am and 10:18 am, the latter of which would only begin its 
            route at 9:13 am.
            - For a train departing its origin (e.g., a northbound train leaving San Jose), AimedArrivalTime = AimedDepartureTime, but
            ExpectedArrivalTime is null.
            - For a train reaching its destination (e.g., a northbound train reaching San Francisco), the API seems to return nothing.
        */
        return new Promise((resolve, reject) => {
            axios.get(`http://api.511.org/transit/StopMonitoring?agency=${operatorId}&api_key=${API_KEY}${stopId ? '&stopCode=' + stopId : ''}`)
                .then((response) => {
                    // debug(response.data);
                    resolve(response.data);
                })
                .catch((error) => {
                    reject(error);
                    debug(error);
                });
        });
    }

    return { getStops, getLines, getTimetables, getStopMonitoring }
}

module.exports = mtcService();