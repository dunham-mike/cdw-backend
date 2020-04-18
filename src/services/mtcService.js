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

    return { getStops, getLines, getTimetables }
}

module.exports = mtcService();