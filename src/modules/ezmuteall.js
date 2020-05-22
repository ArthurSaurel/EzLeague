
const robot = require("robotjs");
const request = require('request');
const processWindows = require("node-process-windows");
const main = require('../index.js');

robot.setKeyboardDelay(1);

let lock = true;

function sendMuteAll() {
    if (lock) return;

    main.log('sendMuteAll'); 
    
    robot.keyTap('enter'); 
    robot.keyTap('numpad_/');                                 
    robot.typeString("mute all");
    robot.keyTap('enter');

    main.log('MuteAll done'); 
}

function mute() {
    lock = false;
    let attempts = 0;  
    
    let timer = setInterval(check, 3 * 1000);
    function check(){
        var currentActiveWindow = processWindows.getActiveWindow((err, processInfo) => {
            if ((err) || (!processInfo)) {
                attempts += 1;
            } else 
            if (processInfo.MainWindowTitle == 'League of Legends (TM) Client') {          
                clearInterval(timer);                                              
                sendMuteAll();  
                lock = true;                   
            } else {
                attempts += 1;                            
            }                                     
        });
        
        if (attempts > 40) {
            main.log('Max attempts');
            clearInterval(timer);
        }
    }    
}

module.exports = {mute};