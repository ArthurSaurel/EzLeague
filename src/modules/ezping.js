const exec = require('child_process').exec;

function get(callback) {
    let lolip = '104.160.141.3';
    exec("ping " + lolip, (error, stdout, stderr) => {
        if (error) {
            log(error) 
            return
        }
    
        if (stderr) {
            log(stderr) 
            return
        }
        let src = 'Moyenne =';
        let ping = stdout.substr(stdout.indexOf(src) + src.length).trim()

        callback(ping);
    });
}

module.exports = {get};