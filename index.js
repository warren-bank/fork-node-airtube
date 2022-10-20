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
const prompt = require('./lib/AirPlay_devices').prompt;

program
    .version(version)
    .usage('<url> [options]')
    .option('-v, --verbose', 'enable verbose mode')
    .option('-t, --timeout <seconds>', 'timeout for bonjour discovery', parseInt, 0)
    .option('-d, --device <device>', 'hostname or IP')
    .option('-p, --port <port>', 'port number', parseInt, 7000)
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

let logDiscovering = ora({
    text: 'Discovering AirPlay devices...',
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
        const hash = '#video.' + (
          (format.isHLS)
            ? 'm3u8'
            : (format.isDashMPD)
              ? 'mpd'
              : (format.container)
                ? format.container
                : 'mp4'
        )

        const videoInfo = {
            title: info.videoDetails.title,
            url:   (format.url + hash)
        }
        return videoInfo
    });
}

function findDevice(videoInfo) {
    return new Promise((resolve, reject) => {
        if (program.device) {
            resolve({deviceHost: program.device, devicePort: program.port, videoInfo});
        } else {
            const devices = []
            let timer = 0

            logDiscovering.start();

            const browser = bonjour.find({type: 'airplay'}, device => {
                if (program.verbose) {
                    logVerboseCommand(`bonjour.find({type: 'airplay'})`)
                    logVerboseOutput(device)
                }
                if (timer === 0) {
                    browser.stop();
                    resolve({deviceHost: device.host, devicePort: device.port, videoInfo});
                }
                else {
                    devices.push(device)
                }
            });

            if (program.timeout > 0) {
                timer = setTimeout(
                    () => {
                        browser.stop();

                        if (devices.length === 0) {
                            logFailure(logDiscovering, 'Unable to discover any AirPlay devices.');
                            reject();
                            return;
                        }

                        logSuccess(logDiscovering, `Discovered ${chalk.blue(devices.length)} AirPlay device${(devices.length === 1) ? '' : 's'}.`);

                        // prompt user to choose 1 of several AirPlay devices found on the LAN
                        const cb = (device) => {
                            resolve({deviceHost: device.host, devicePort: device.port, videoInfo});
                        }
                        prompt(devices, cb)
                    },
                    (program.timeout * 1000)
                )
            }
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
