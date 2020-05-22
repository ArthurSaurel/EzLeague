const lolgraph = require('../lolgraph.js');
const api = require('../lcu-api');
const config = require('../config');
const main = require('../index.js');
const { upperFirst } = require('lodash');

var pages_map = new Map();
var spells_map = new Map();
var urls_map = new Map();

function getChampRoleKey(champ, role) {
    return champ + ';' + role;
}

function isLoaded(key){
    return (pages_map.has(key) && spells_map.has(key) && urls_map.has(key))
}

function preload(champions) {
    lolgraph._getAllLoadouts(champions, pages_map, spells_map, urls_map);
}

function createRunePage(page) {
    api.post("/lol-perks/v1/pages/", page)
    .then(res =>  main.log('create page', page.name)); 
}

function applyRunePage(newpage) {
    api.get("/lol-perks/v1/currentpage").then(page => {        
        if(!page) {
            main.log("Error: current page initialization failed");
            return;
        }
        if (page.isDeletable) { 
            api.del("/lol-perks/v1/pages/"+page.id)
            .then(res => {
                main.log('del old page '+ page.name)
                createRunePage(newpage)
            })
            .catch(err => {throw Error(err)});
        } 
        else {
            createRunePage(newpage);
        }
    })
}

function applySpells(summs, gamemode) {
    let spell1   = summs[0];
    let spell2   = summs[1];

    //Si on est en aram -> Snowball/Flash
    if (gamemode == 'ARAM') {
        spell1 = 32;
        spell2 = 4;
    }
    
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
        main.log('summ change', spell1, spell2);
    })
    .catch(err => main.log(err));
}

function showGuide(url, champ, role) {
    let img_path = '/ressources/league.png';
    let content  = "⇨ Guide de " + upperFirst(champ.toLowerCase()) + " " + upperFirst(role.toLowerCase()) + " sur LeagueOfGraphs.com";
    main.pop_up(url, img_path, content, config.get('guideTime'));  
}

function load(champ, role, gamemode) {
    let key = getChampRoleKey(champ, role);
    if (isLoaded(key)) {
        main.log(key + ' deja en memoire');
        if (config.get('EzRunes'))  applyRunePage(pages_map.get(key));
        if (config.get('EzSpells')) applySpells(spells_map.get(key), gamemode);               
        if (config.get('EzGuide'))  showGuide(urls_map.get(key), champ, role);
    } else {
        lolgraph._getLoadout(champ, role, loadout => {
            pages_map.set(key,loadout.new_page);
            spells_map.set(key,loadout.new_summ);
            urls_map.set(key,loadout.new_url);
            main.log(key + ' desormais en memoire ');
            if (config.get('EzRunes'))  applyRunePage(loadout.new_page);
            if (config.get('EzSpells')) applySpells(loadout.new_summ, gamemode);               
            if (config.get('EzGuide'))  showGuide(loadout.new_url, champ, role);
        })
    }       
}

module.exports = {preload, load};