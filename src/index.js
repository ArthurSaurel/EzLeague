const electron = require('electron');
const {app, Tray, Menu, BrowserWindow, dialog, nativeImage, Notification} = require('electron');
const logger = require('electron-log');
const Positioner = require('electron-positioner')
const LCUConnector = require('lcu-connector');
const events = require('events');
const path = require('path');
const url = require('url');
const request = require('request');
var config = require('./config');
var AutoLaunch = require('auto-launch');
const { upperFirst } = require('lodash');
var child = require('child_process').execFile;
const chokidar = require('chokidar');
const csv = require('csv-parser');  
const fs = require('fs');

if(require('electron-squirrel-startup')) return;

const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

let roleDlg = null;
let paramsDlg = null;
let appIcon = null;

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) app.quit();

var EzLeaguAutoLaunch = new AutoLaunch({
    name: 'EzLeague',
    path: process.execPath,
});

if (config.get('autoLaunch')) 
    EzLeaguAutoLaunch.enable()
else 
    EzLeaguAutoLaunch.disable();

logger.transports.file.fileName = 'EzLog.txt';
// %USERPROFILE%\AppData\Roaming\EzLeague\EzLog.txt
function log(s) {
    if (config.get('saveLogs')) 
        logger.info(s)
    else 
        console.log(s);
}

var api_event = new events.EventEmitter();

var paused = false;
var connected = false;
var roleSelected = '';
var handleTimeout = null;
var startTime = null;

function isPaused() {
    return paused;
}

function getTimeLeft() {
    let result = 0;

    if (handleTimeout) result = handleTimeout._idleTimeout - (Date.now() - startTime)  
   
    return result;
}

function stopTimer() {
    if (handleTimeout)  {
        clearTimeout(handleTimeout);
        handleTimeout = null;
    }  
    roleDlg.hide();
}

function selectNewRole(role) {
    stopTimer();      
    
    log('selectNewRole = ' + role);  
    api_event.emit('champion:Update', role)
}

function selectDirectory(defPath) {
    let directory =  dialog.showOpenDialog(roleDlg, {
                properties: ['openFile'],
                defaultPath: defPath
    })

    return directory;
}

var eNotify = null;

//Ouvrir une notif en bas a droite
function pop_up(_url, _imgpath, _content, _time) {
    if (!eNotify) return;

    eNotify.setConfig({        
        displayTime: _time * 1000,
        width:300,
        defaultStyleContainer: {
            backgroundColor: "#0f141c",
            overflow: 'hidden',
            padding: 7,    
            border: '1px solid #86b9d6',       
            fontFamily: 'Arial',
            fontSize: 14,
            position: 'relative',
            lineHeight: '18px'
            },
        defaultStyleText: {
            color: '#86b9d6',
            margin: 0,
            overflow: 'hidden',
            cursor: 'pointer'
        }, 
        defaultStyleImage: {
            overflow: 'hidden',
            float: 'left',
            height: 40,
            width: 40,
            marginRight: 10
            }
    });

    eNotify.notify({
        image: path.join(__dirname, _imgpath),
        text: _content,
        url: _url
    });
}

module.exports = { isPaused, selectNewRole, selectDirectory, getTimeLeft, EzLeaguAutoLaunch, log, pop_up };

const ezProc    = require('./modules/ezproc');
const ezPing    = require('./modules/ezping');
const ezLobby   = require('./modules/ezlobby');
const ezLoadout = require('./modules/ezloadout');
const ezMuteAll = require('./modules/ezmuteall');

const connector = new LCUConnector(config.get('leaguepath').toString());
const api = require('./lcu-api');

function onClickOption(menuItem) {
    if (menuItem.label == 'EzPing') {
        ezPing.get((ping => {
            appIcon.displayBalloon({ 
                icon    : path.join(__dirname, '/ressources/blitz.png'),
                title   : 'Ping Seveur EUW',
                content : 'Moyenne : ' + ping
            });  
        }));
           
    } else
        config.set(menuItem.label, menuItem.checked);  
}

function onClickPause(menuItem) {    
    paused = menuItem.checked
    if (paused) {
        appIcon.setImage(path.join(__dirname, '/ressources/connect_orange.png'));
        appIcon.setToolTip('EzLeague - Pause');
    } else {
        if (connected) {
            appIcon.setImage(path.join(__dirname, '/ressources/connect_green.png'));
            appIcon.setToolTip('EzLeague - Connecté');   
        } else {
            appIcon.setImage(path.join(__dirname, '/ressources/connect_red.png'));
            appIcon.setToolTip('EzLeague - Client introuvable');
        }         
    }
}

const menu_template =   [ 
                            {
                                label: 'EzProc',
                                type: 'checkbox',
                                checked: config.get('EzProc'),
                                click:onClickOption
                            },
                            {
                                label: 'EzRunes',
                                type: 'checkbox',
                                checked: config.get('EzRunes'),
                                click:onClickOption
                            },
                            {
                                label: 'EzSpells',
                                type: 'checkbox',
                                checked: config.get('EzSpells'),
                                click:onClickOption
                            },
                            {
                                label: 'EzGuide',
                                type: 'checkbox',
                                checked: config.get('EzGuide'),
                                click:onClickOption
                            },
                            {
                                label: 'EzLobby',
                                type: 'checkbox',
                                checked: config.get('EzLobby'),
                                click:onClickOption
                            },
                            {
                                label: 'EzMuteAll',
                                type: 'checkbox',
                                checked: config.get('EzMuteAll'),
                                click:onClickOption
                            },
                            {
                                label: 'EzPing',
                                icon: path.join(__dirname, '/ressources/blitzicon.png'), 
                                click:onClickOption
                            },
                            { type: 'separator' },                            
                            {
                                label: 'Pause',
                                type: 'checkbox',   
                                checked: false,                             
                                click: onClickPause
                            },
                            {
                                label: 'Options',
                                icon: path.join(__dirname, '/ressources/settings.png'),
                                click:showParamsDlg
                            },                            
                            {
                                label: 'Quitter',
                                type: 'normal',
                                icon: path.join(__dirname, '/ressources/close.png'),
                                role: 'quit'
                            }
                        ];


var League_version = '';
var League_champs  = null;
var League_SummSpells = null;
var currentChamp = null;
var currentGameMode = null;
var gamemode = '';

function showRoleDlg() {
    var positioner = new Positioner(roleDlg);    
    let pos = positioner.calculate('bottomRight');
    roleDlg.setPosition(pos.x - 20, pos.y - 10);
    roleDlg.show();
    startTime = Date.now();  
}

function showParamsDlg() {
    paramsDlg = new BrowserWindow({
        title : 'Options',
        icon : path.join(__dirname, '/ressources/newmain.png'),
        width: 420,
        height: 780,
        resizable : false,
        show : false
    })

    paramsDlg.loadURL(url.format({
        pathname : path.join(__dirname,'paramsDlg.html'),        
        protocol : 'file:',
        slashes : true
    }));

    paramsDlg.setMenu(null);

    var positioner = new Positioner(paramsDlg);    
    positioner.move('center');

    paramsDlg.webContents.once('dom-ready', () => {
        paramsDlg.show();
    })
    
}

var wss = null;

app.on('ready', function()  {
    appIcon = new Tray(path.join(__dirname, '/ressources/connect_red.png'));
    
    var contextMenu = Menu.buildFromTemplate(menu_template);
    
    appIcon.setToolTip('EzLeague - Client introuvable');
    appIcon.setContextMenu(contextMenu);
    
    roleDlg = new BrowserWindow({
        title : 'Choix du role',
        icon : path.join(__dirname, '/ressources/newmain.png'),
        width: 400,
        height: 80,
        frame : false,
        resizable : false,
        show : false
    });        
    
    roleDlg.loadURL(url.format({
        pathname : path.join(__dirname,'roleDlg.html'),        
        protocol : 'file:',
        slashes : true
    }));

    let display = electron.screen.getPrimaryDisplay();

    appIcon.on('click', (event) => {
        log('click');                    
    
        if (!connected) return;

        api_event.emit('before-champion:Update', event.ctrlKey);       
    });
    
    appIcon.on('double-click', (event) => {
        log('doubleclick');    

        if (connected) return;

        child(config.get('leaguepath').toString(), function(err, data) {
            if (err) {
               log(err);
               return;
            }         
            log(data.toString());
        });
    });

    connector.start();
   
    //Init des données de League
    request('https://ddragon.leagueoflegends.com/api/versions.json', function (error, response, data) {
        if(!error && response && response.statusCode == 200) {            
            League_version = JSON.parse(data)[0];
            log('League_version ' + League_version);            

            request('http://ddragon.leagueoflegends.com/cdn/'+League_version+'/data/en_US/champion.json', function(error, response, data) {
                if(!error && response && response.statusCode == 200){
                    League_champs = JSON.parse(data).data;   

                    if (config.get('preload') > 0) {
                        ezLoadout.preload(Object.keys(League_champs));
                    }

                    log("League_champs loaded");                    
                } else throw Error("Couldn't get ddragon api champions cdn");
            });

            request('http://ddragon.leagueoflegends.com/cdn/'+League_version+'/data/en_US/summoner.json', function(error, response, data) {
                if(!error && response && response.statusCode == 200){
                    League_SummSpells = JSON.parse(data).data;   
                    log("League_SummSpells loaded");
                } else throw Error("Couldn't get ddragon api summ spells cdn");
            });
        }
        else throw Error("Couldn't get ddragon api version");
    });

    eNotify = require('electron-notify'); 
    
    wss = new WebSocketServer({port : 5001});

    wss.on('connection', function(ws) {        
        //On attend une seconde pour laisser le temps à l'appli de charger la bonne activité
        setTimeout(function() {
            api_event.emit('ws_connect');
        }, 1000);

        ws.on('message', function(msg) {
            if (msg == 'accept') {
                console.log('accept_proc');
                ezProc.accept();
            }
        });
    })    

    log('Ready to go');          
})

connector.on('connect', (data) => {
    connected = true;
    appIcon.setImage(path.join(__dirname, '/ressources/connect_green.png'));
    appIcon.setToolTip('EzLeague - Connecté');
    api.bind(data, api_event);
});

connector.on('disconnect', () => {
    connected = false;
    appIcon.setImage(path.join(__dirname, '/ressources/connect_red.png'));
    appIcon.setToolTip('EzLeague - Client introuvable');
    api.destroy();
});

api_event.on('ws_broadcast', data => {
    console.log("ws_broadcast", data)
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
    });
})

api_event.on('ws_connect', data => {
    log('Appairage Mobile OK');

    api.get('/lol-gameflow/v1/gameflow-phase').then(data => {
        if (!data) return;
        
        api_event.emit('ws_broadcast', data.toLowerCase());                 
    }) 
});

//GameFlow
api_event.on('/lol-gameflow/v1/gameflow-phase:Update',  (data) => {
    api_event.emit('ws_broadcast', data.toLowerCase());  

    if (data.toLowerCase() == 'gamestart') 
        api_event.emit('client-gamestart');
     
})

//Proc
api_event.on('/lol-matchmaking/v1/ready-check:Update', data => {
    if (!data) { return };    

    if ((data.state == 'InProgress') && (data.timer == 0)) {
        api_event.emit('ws_broadcast', 'readycheck');    
    }
    
    if (config.get('EzProc') && (data.state == 'InProgress') 
       && (data.timer == config.get('procTime') || (config.get('procTime') == 0))) {        
        ezProc.accept();
    }  
});

//Champion pick
api_event.on('/lol-champ-select/v1/current-champion:Create',  (data) => {
    if (currentChamp == data) return;
    
    log('pick = ' + data);

    currentChamp = data;    
    api_event.emit('before-champion:Update', false)
})


//Champion swap
api_event.on('/lol-champ-select/v1/current-champion:Update',  (data) => {
    if (currentChamp == data) return;
    
    log('swap',data);

    currentChamp = data; 
    api_event.emit('before-champion:Update', false);
})

//Champion delete
api_event.on('/lol-champ-select/v1/current-champion:Delete',  () => {
    log('del/exit');

    currentChamp = null; 
    currentGameMode = null;
    stopTimer();
})

api_event.on('game-started', () => { 
    log('game-started')   
    api_event.emit('ws_broadcast', 'gamestarted'); 
    ezMuteAll.mute();
});

api_event.on('client-gamestart', () => {
    log('client-gamestart');

    const options = {
        json: true,
        url : 'https://127.0.0.1:2999/liveclientdata/eventdata',
        insecure: true,
        rejectUnauthorized: false
    };

    let attempts = 0;
    let timer = setInterval(checkGameStarted, 2000);
    function checkGameStarted(){    
        attempts += 1;        
        request.get(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body.Events.forEach(event => {
                    if (event.EventName == 'GameStart') {
                        clearInterval(timer);
                        api_event.emit('game-started');
                    }
                });
            }      
        });

        if (attempts > 600) {
            log('Max attempts');
            clearInterval(timer);
        }
    }    
})

//Avant de déclencher le changement de champion on cherche le role
api_event.on('before-champion:Update', (forceRoleDlg) => { 
    stopTimer();

    if (eNotify) eNotify.closeAll();

    api.get('/lol-champ-select/v1/session').then(data => {
        if (!data) return;
    
        if (!data.hasOwnProperty('myTeam')) return; //si on est pas en champselect..

        var player_infos = data.myTeam.find((el) => data.localPlayerCellId === el.cellId);
    
        if (!player_infos) return;   

        let role  = player_infos.assignedPosition.toString().toLowerCase();
        
        api.get('/lol-gameflow/v1/session').then(data => {
            currentGameMode = data.gameData.queue.gameMode.toString().toUpperCase();            
            
            if (role == 'utility') role = 'support'
            else 
            if (role == 'bottom') role = 'adc'
            else 
            if ((role == '') && (currentGameMode == 'ARAM')) role = 'middle';  
            
            log('Role = '.concat(role));
            log('Gamemode = '.concat(currentGameMode));

            //Si pas de role ouvre fenetre de choix
            if (((role == '') || forceRoleDlg) && config.get('bShowRoleDlg')) {
                showRoleDlg();
                handleTimeout = setTimeout(() => {
                    if (config.get('NoRoleSoMid')) selectNewRole('middle')
                    else  selectNewRole('');
                }, config.get('roleTime') * 1000);
            } else if ((role == '') && config.get('NoRoleSoMid')){
                selectNewRole('middle')
            } else {
                selectNewRole(role)
            }
        })        
    })     
})

api_event.on('champion:Update', (role) => {
    let champ = Object.keys(League_champs).find((el) => League_champs[el].key == currentChamp).toLowerCase().replace(/\s/g, '');

    if (config.get('EzRunes') || config.get('EzSpells') || config.get('EzGuide')) {
        ezLoadout.load(champ, role, currentGameMode);
    }
})

api_event.on('/lol-champ-select/v1/session:Update', data => {
    if (!data) return;
    
    if ((data.timer.phase == "GAME_STARTING") && (config.get('EzLobby'))) {
        ezLobby.show();
    };
});     