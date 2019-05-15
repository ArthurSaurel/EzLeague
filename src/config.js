var Store = require('electron-store');

config = new Store({
    name: "config",
	defaults: {
        leaguepath: "C:/Riot Games/League of Legends/LeagueClient.exe",
        EzProc      : true,
        EzGuide     : true,
        EzRunes     : true,
        EzSpells    : true,
        EzLobby     : true,
        EzMuteAll   : true,
        FlashOnF    : true,
        NoRoleSoMid : false,
        bShowRoleDlg: true,
        saveLogs    : false,
        guideTime : 10,
        lobbyTime : 30,
        procTime  : 9,
        roleTime  : 10,
        autoLaunch : false 
    }
});

module.exports = config;