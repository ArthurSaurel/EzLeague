const {app, Tray, Menu, BrowserWindow, dialog, nativeImage, Notification} = require('electron');
const logger = require('electron-log');
const Positioner = require('electron-positioner')
const LCUConnector = require('lcu-connector');
const events = require('events');
const path = require('path');
const url = require('url');
const request = require('request');
const lolgraph = require('./lolgraph.js');
var config = require('./config');
var AutoLaunch = require('auto-launch');
const { upperFirst } = require('lodash');
const processWindows = require("node-process-windows");
var child = require('child_process').execFile;
var exec = require('child_process').exec;
const chokidar = require('chokidar');
const csv = require('csv-parser');  
const fs = require('fs');
var robot = require("robotjs");

if(require('electron-squirrel-startup')) return;

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
    console.log(s);
    if (config.get('saveLogs')) logger.info(s);
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

function displayPing() {
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
        appIcon.displayBalloon({ 
                                icon    : path.join(__dirname, '/ressources/blitz.png'),
                                title   : 'Ping Seveur EUW',
                                content : 'Moyenne : ' + ping
                            }); 
    });
}
module.exports = { isPaused, selectNewRole, selectDirectory, getTimeLeft, EzLeaguAutoLaunch};

const connector = new LCUConnector(config.get('leaguepath').toString());
const api = require('./lcu-api');

function onClickOption(menuItem) {
    config.set(menuItem.label, menuItem.checked)  
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
                                click:displayPing
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
        width: 400,
        height: 650,
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

var eNotify = null;

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
    request('https://ddragon.leagueoflegends.com/realms/euw.json', function (error, response, data) {
        if(!error && response && response.statusCode == 200) {            
            League_version = JSON.parse(data)["v"];
            log('League_version',League_version);            

            request('http://ddragon.leagueoflegends.com/cdn/'+League_version+'/data/en_US/champion.json', function(error, response, data) {
                if(!error && response && response.statusCode == 200){
                    League_champs = JSON.parse(data).data;                   
                    log("Champions loaded");
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

//Proc
api_event.on('/lol-matchmaking/v1/ready-check:Update', data => {
    if (!data) { return };
    
    if (config.get('EzProc') && (data.state == 'InProgress') 
       && (data.timer == config.get('procTime') || (config.get('procTime') == 0))) {        
        api.post('/lol-matchmaking/v1/ready-check/accept').then( function() {
            log('Proc Accepted');
        })
        .catch(err => log(err));
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
    stopTimer();
})

let doMute = false;

robot.setKeyboardDelay(1);

function sendMuteAll() {
    log('sendMuteAll'); 
    
    robot.keyTap('enter');
    //robot.keyTap('space'); 
    robot.keyTap('numpad_/');                                 
    robot.typeString("mute all");
    robot.keyTap('enter');
}

//Do Mute All
api_event.on('do-mute-all', () => {
    log("On mute all");
    let attempts = 0;   
    let timer = setInterval(check, 3 * 1000);
    function check(){
        var currentActiveWindow = processWindows.getActiveWindow((err, processInfo) => {
            if ((err) || (!processInfo)) {
                log(err)
                attempts += 1;
            } else if (processInfo.MainWindowTitle == 'League of Legends (TM) Client') {                    
                if (doMute) {                                
                    sendMuteAll()                     
                }
                doMute = false  
                clearInterval(timer);
            } else {
                attempts += 1;                            
            }                                     
        });
        
        if (attempts > 40) {
            log('Max attempts');
            clearInterval(timer);
        }
    }    
});

api_event.on('/riotclient/ux-state/request:Update', (data) => {
    if (!config.get('EzMuteAll') || (!data) || (data.state != 'MinimizeAll')) return;  
    
    log('/riotclient/ux-state/request:Update = ' + data.state);

    doMute = true

    let watcherReady = false;
    let gameLogsDirectory = config.get('leaguepath').split('\\').slice(0, -1).join('/') + '/Logs/GameLogs';

    let csvWatcher = null;

    let logDirWatcher = chokidar.watch(gameLogsDirectory, {
        ignored: /(^|[\/\\])\../,
        persistent: true
    });

    logDirWatcher.on('ready', () => {
        watcherReady = true;
    });

    logDirWatcher.on('add', (path) => {
        if (!watcherReady) return;

        if (path.split('.').pop() == 'csv') {
            log(`CSV File ${path} has been added`) 
            logDirWatcher.close();

            let attempts = 0;
            let timer = setInterval(checkFile, 1000);
            function checkFile(){
                fs.createReadStream(path)  
                    .pipe(csv())
                    .on('data', (row) => {
                        lastrow = row;
                    })
                    .on('end', () => {
                        //log('lastrow', lastrow['game.time']);
                        if (parseFloat(lastrow['game.time']) >= 2)  {
                            log('gametime >= 2');
                            clearInterval(timer);
                            api_event.emit('do-mute-all');
                        } else {
                            attempts += 1;    
                        }
                    }); 
                
                if (attempts > 300) {
                    log('Max attempts');
                    clearInterval(timer);
                }
            }    
        }       
    });    
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
            gamemode = data.gameData.queue.gameMode.toString().toUpperCase();            
            
            if (role == 'utility') role = 'support'
            else 
            if (role == 'bottom') role = 'adc'
            else 
            if ((role == '') && (gamemode == 'ARAM')) role = 'aram';  
              
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
        lolgraph._getLoadout(champ, role, loadout => {
            log('_getLoadout ' + champ + ' ' + role)
            if (config.get('EzRunes'))  api_event.emit('do:runes:update',  loadout.new_page);
            if (config.get('EzSpells')) api_event.emit('do:spells:update', loadout.new_summ);               
            if (config.get('EzGuide'))  api_event.emit('do:guide:create',  loadout.new_url, champ, role);
        })
    }
})

api_event.on('do:runes:update', (newpage) => {
    api.get("/lol-perks/v1/currentpage").then(page => {        
        if(!page) {
            log("Error: current page initialization failed");
            return;
        }

        if (page.isDeletable) { 
            api.del("/lol-perks/v1/pages/"+page.id)
            .then(res => {
                log('del old page '+ page.name)
                api_event.emit('do:page:create', newpage)
            })
            .catch(err => {throw Error(err)});
        } 
        else api_event.emit('do:page:create', newpage);
    })
})

api_event.on('do:page:create', (page, champion) => {
    api.post("/lol-perks/v1/pages/", page)
    .then(res =>  log('create page', page.name)); 
})

api_event.on('do:spells:update', (summs) => {
    let spell1   = summs[0];
    let spell2   = summs[1];

/*  Les infos du JSON ne sont pas complètes
    if (!Object.values(League_SummSpells).filter((el) => parseInt(el.key) == spell1)[0].modes.includes(gamemode) 
        || !Object.values(League_SummSpells).filter((el) => parseInt(el.key) == spell2)[0].modes.includes(gamemode) ) {
            log('ignite-flash')
            spell1 = 14; //Ignite;
            spell2 = 4;  //Flash;
    }
*/
    if ((spell1 == 4) && config.get('FlashOnF')) {                
        spell1 = spell2;
        spell2 = 4;
    } 
    else
    if ((spell2 == 4) && !config.get('FlashOnF')) {
        spell2 = spell1;
        spell1 = 4;   
    }

    json = {
        spell1Id : spell1,
        spell2Id : spell2
    };

    api.patch("/lol-champ-select/v1/session/my-selection",json).then( (data) => {
        log('summ change', spell1, spell2);
    })
    .catch(err => log(err));
})

api_event.on('do:guide:create', (url, champion, role) => {
    let img_path = '/ressources/league.png';
    let content  = "⇨ Guide de " + upperFirst(champion.toLowerCase()) + " " + upperFirst(role.toLowerCase()) + " sur LeagueOfGraphs.com";
    pop_up(url, img_path, content, config.get('guideTime'));  
})

api_event.on('/lol-champ-select/v1/session:Update', data => {
    if (!data) return;
    
    if ((data.timer.phase == "GAME_STARTING") && (config.get('EzLobby'))) {
        api.get('/lol-summoner/v1/current-summoner').then( data => {
            let prof_url = "https://porofessor.gg/fr/live/euw/" + data.displayName;
            let img_path = '/ressources/porofessor.png';
            let content  = "⇨ Infos des joueurs la game sur Porofessor.gg";
            pop_up(prof_url, img_path, content, config.get('lobbyTime'));
        })
        .catch(err => log(err));
        return;
    };
});     

