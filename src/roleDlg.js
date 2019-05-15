const remote = require('electron').remote;
const main = remote.require('./index.js');
const config = remote.require('./config');

function selectRole(role) {
    main.selectNewRole(role)
}

function progress() {
    let timeleft = main.getTimeLeft();
    let progressBarWidth = "0%";
    if (timeleft > 0) {    
        let timetotal = config.get('roleTime') * 1000;
        
        var percent =(timeleft * 100) / timetotal;
        
        progressBarWidth = percent.toString() + "%";    
    }   

    document.getElementById('timer').style.width = progressBarWidth;

    requestAnimationFrame(progress);      
};

requestAnimationFrame(progress); 
   
   
