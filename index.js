#!/usr/bin/env node

/**
 * Module dependencies.
 */

const program = require('commander');
const version = require('./package.json').version;
const ytdl = require('ytdl-core');
const AirPlay = require('airplay-protocol');
const ora = require('ora');
const chalk = require('chalk');
const bonjour = require('bonjour')();

program
    .version(version)
    .usage('<url> [options]')
    .option('-v, --verbose', 'enable verbose mode')
    .option('-d, --device <device>', 'hostname or IP')
    .option('-p, --port <port>', 'port number', 7000)
    .parse(process.argv);

const url = program.args[0]; //TODO pattern to check youtube link
if (!url) {
    program.help();
}

let logGetInfo = ora({
    text: 'Loading video info...',
    spinner: 'dots2',
    color: 'yellow',
    interval: 100
});

let logConnecting = ora({
    text: 'Connecting to AirPlay device...',
    spinner: 'dots2',
    color: 'yellow',
    interval: 100
});

let logPlay = ora({
    text: 'Playing YouTube video...',
    spinner: 'dots2',
    color: 'yellow',
    interval: 100
});

const logVerboseCommand = (text) => {
    if (program.verbose && text) {
        console.log(chalk.green(text))
    }
}

const logVerboseOutput = (text) => {
    if (program.verbose && text) {
        if (typeof text === 'object') {
            text = JSON.stringify(text, null, 4)
        }
        console.log(chalk.yellow(text))
    }
}

const logSuccess = (logger, text) => {
    logger.succeed(text)
    logVerboseOutput('Success: ' + text)
}

const logFailure = (logger, text) => {
    logger.fail(text)
    logVerboseOutput('Failure: ' + text)
}

logGetInfo.start();


ytdl
    .getInfo(url)
    .then(chooseFormat)
    .then(findDevice)
    .then(playVideo)
    .catch(err => {
        if (err) {
            console.error('\n' + chalk.red('Error'), err.message);
            logVerboseOutput(err.stack)
        }
        return(-1);
    })
    .then(process.exit);


function chooseFormat(info) {
    return new Promise((resolve, reject) => {
        if (!info || !info.formats) {
            logFailure(logGetInfo, 'Cannot get video info.');
            reject();
            return;
        }

        const format = ytdl.chooseFormat(info.formats, {
            filter: 'video' // TODO different qualities
        });

        if (!format || !format.url) {
            logFailure(logGetInfo, 'Cannot find proper source.');
            reject();
            return;
        }

        logSuccess(logGetInfo, `Video info loaded. Using ${chalk.blue(format.qualityLabel)}.`);
        resolve(format);
    })
    .then(format => {
        if (program.verbose) {
            logVerboseCommand(`ytdl.getInfo("${url}")`)
            logVerboseOutput(info)

            logVerboseCommand(`ytdl.chooseFormat(formats, {filter: 'video'})`)
            logVerboseOutput(format)
        }
        return format;
    })
    .then(format => {
        const videoInfo = {
            title: info.videoDetails.title,
            url:   format.url
        }
        return videoInfo
    });
}

function findDevice(videoInfo) {
    return new Promise((resolve, reject) => {
        if (program.device) {
            resolve({deviceHost: program.device, devicePort: program.port, videoInfo});
        } else {
            const browser = bonjour.find({type: 'airplay'}, devices => {
                if (program.verbose) {
                    logVerboseCommand(`bonjour.find({type: 'airplay'})`)
                    logVerboseOutput(devices)
                }
                browser.stop();
                resolve({deviceHost: devices.host, devicePort: devices.port, videoInfo});
            });
        }
    });
}

function playVideo({deviceHost, devicePort, videoInfo}) {
    return new Promise((resolve, reject) => {
        logConnecting.start();

        const airplayDevice = new AirPlay(deviceHost, devicePort);

        if (!airplayDevice) {
            logFailure(logConnecting, 'AirPlay device connection error.');
            reject();
            return;
        }

        //TODO airplayDevice.on error
        airplayDevice.play(videoInfo.url, function (err) {
            if (err) {
                logFailure(logConnecting, 'AirPlay playback error.');
                reject(err);
                return;
            }

            logSuccess(logConnecting, `Connected to ${chalk.blue(deviceHost + ':' + devicePort)}`);
            if (videoInfo.title) {
                logPlay.text = `Playing "${chalk.blue(videoInfo.title)}"...`;
            }
            logPlay.start();
            logSuccess(logPlay, logPlay.text);
            resolve(0);
        })
    });
}
