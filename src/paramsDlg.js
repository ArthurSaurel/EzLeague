const remote = require('electron').remote;
const main = remote.require('./index.js');
const config = remote.require('./config');

//Init()
document.addEventListener("DOMContentLoaded", function() {
    if (config.get('NoRoleSoMid') && config.get('bShowRoleDlg')) {
        document.getElementById('both').checked = true;
    } else if (config.get('NoRoleSoMid')) {
        document.getElementById('mid').checked = true;
    } else if (config.get('bShowRoleDlg')) {
        document.getElementById('dlg').checked = true;    
    } else {
        document.getElementById('none').checked = true;   
    }

    switch (config.get('preload')) {
        case 0 : document.getElementById('norole').checked = true;
                 break;
        case 1 : document.getElementById('mainrole').checked = true;
                 break;
        case 2 : document.getElementById('allroles').checked = true;
                 break;
    }

    document.getElementById('autolaunch').checked = config.get('autoLaunch');
    document.getElementById('saveLogs').checked = config.get('saveLogs');

    document.getElementById('guideRange').value = config.get('guideTime');  
    document.getElementById('guideTps').innerHTML= "Durée notification du guide : " + config.get('guideTime') + " secondes";    
    document.getElementById('lobbyRange').value = config.get('lobbyTime');   
    document.getElementById('lobbyTps').innerHTML= "Durée notification du lobby : " + config.get('lobbyTime') + " secondes";  
    document.getElementById('roleRange').value = config.get('roleTime');   
    document.getElementById('roleTps').innerHTML= "Durée fenêtre choix de role : " + config.get('roleTime') + " secondes"  
    document.getElementById('procRange').value = config.get('procTime');  
    document.getElementById('procTps').innerHTML= "Accepter proc au bout de : " + config.get('procTime') + " secondes";  

    if (config.get('FlashOnF')) {
        document.getElementById('flashShortcut').innerHTML='F'
    } else {
        document.getElementById('flashShortcut').innerHTML='D'
    }

    document.getElementById('clientDir').value = config.get('leaguepath');
});

document.getElementById("annul-btn").addEventListener("click", function (e) {
    var window = remote.getCurrentWindow();
    window.close();
}); 

document.getElementById("valid-btn").addEventListener("click", function (e) {
    if (document.getElementById('both').checked) {
        config.set('NoRoleSoMid', true);
        config.set('bShowRoleDlg', true);
    } else if (document.getElementById('dlg').checked) {
        config.set('NoRoleSoMid', false);
        config.set('bShowRoleDlg', true); 
    } else if (document.getElementById('mid').checked) {
        config.set('NoRoleSoMid', true);
        config.set('bShowRoleDlg', false);  
    } else {
        config.set('NoRoleSoMid', false);
        config.set('bShowRoleDlg', false);  
    }

    if (document.getElementById('allroles').checked) {
        config.set('preload', 2);
    } else if (document.getElementById('mainrole').checked) {
        config.set('preload', 1);
    } else {
        config.set('preload', 0);
    }

    config.set('guideTime', document.getElementById('guideRange').value); 
    config.set('lobbyTime', document.getElementById('lobbyRange').value); 
    config.set('roleTime', document.getElementById('roleRange').value);  
    config.set('procTime', document.getElementById('procRange').value);   
    config.set('FlashOnF', document.getElementById('flashShortcut').innerHTML=='F');
    config.set('leaguepath',document.getElementById('clientDir').value);    

    config.set('autoLaunch', document.getElementById('autolaunch').checked);
    config.set('saveLogs', document.getElementById('saveLogs').checked);

    if (config.get('autoLaunch')) 
        main.EzLeaguAutoLaunch.enable()
    else 
        main.EzLeaguAutoLaunch.disable();

    var window = remote.getCurrentWindow();
    window.close();
}); 

function DorF() {
    if (document.getElementById('flashShortcut').innerHTML=='D') {
        document.getElementById('flashShortcut').innerHTML='F'
    } else {
        document.getElementById('flashShortcut').innerHTML='D'
    }
}

function srchclientDir(){
    let newdir = main.selectDirectory(document.getElementById('clientDir').value);

    document.getElementById('clientDir').value = newdir;
}

function updateTime(id, value) {
    if (id == "guideRange") {
        document.getElementById('guideTps').innerHTML= "Duree notification du guide : " + value + " secondes"    
    } else if (id == "lobbyRange") {
        document.getElementById('lobbyTps').innerHTML= "Duree notification du lobby : " + value + " secondes"    
    } else if (id == "procRange") {
        document.getElementById('procTps').innerHTML= "Accepter proc au bout de : " + value + " secondes"    
    } else if (id == "roleRange") {
        document.getElementById('roleTps').innerHTML= "Durée fenêtre choix de role : " + value + " secondes"  
    }
}
