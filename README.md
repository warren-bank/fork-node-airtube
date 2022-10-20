## Command line tool to play YouTube videos on your Apple TV

Tested with:
* Apple TV gen 4
* [ExoAirPlayer](https://github.com/warren-bank/Android-ExoPlayer-AirPlay-Receiver)

### Install
```
npm i @warren-bank/airtube -g
```
or
```
yarn global add @warren-bank/airtube
```

### Usage
```
airtube <url> [options]
```

#### Options
```
    -h, --help               output usage information
    -V, --version            output the version number
    -v, --verbose            enable verbose mode
    -t, --timeout <seconds>  timeout for bonjour discovery
    -d, --device <device>    hostname or IP
    -p, --port <port>        port number
```
