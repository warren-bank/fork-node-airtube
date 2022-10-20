const chalk = require('chalk');

const prompt_user_to_choose_one_device = function(devices, cb) {
  if (devices.length === 0) return cb(false)
  if (devices.length === 1) return cb(devices[0])

  console.log()
  console.log('Please select one AirPlay device:')
  for (var i=0; i<devices.length; i++) {
    console.log(`    ${chalk.blue(i+1)}) ${devices[i]['host']} (${devices[i]['name']})`)
  }
  console.log()

  const replay_prompt = function() {
    console.log('Please enter the number corresponding to your selection:')
  }

  replay_prompt()

  //Start reading input
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', function (text) {
    console.log()

    text = text.trim()
    if (!text) return replay_prompt()

    var num = Number(text)
    if ( (typeof num !== 'number') || (isNaN(num)) ) return replay_prompt()

    num--
    if (num < 0 || num >= devices.length) {
      console.log('The number entered is outside the range of valid options.')
      return replay_prompt()
    }

    //Stop reading input
    process.stdin.pause()

    cb(devices[num])
  })
}

module.exports = {prompt: prompt_user_to_choose_one_device}
