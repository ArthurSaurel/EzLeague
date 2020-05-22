const api = require('../lcu-api');
const config = require('../config');
const main = require('../index.js');

function show(callback) {
    api.get('/lol-summoner/v1/current-summoner').then( data => {
        let url = "https://porofessor.gg/fr/live/euw/" + data.displayName;
        let imgpath = '/ressources/porofessor.png';
        let text  = "⇨ Infos des joueurs la game sur Porofessor.gg";

        main.pop_up(url, imgpath, text, config.get('lobbyTime'));
    })
    .catch(err => log(err));
}

module.exports = {show};