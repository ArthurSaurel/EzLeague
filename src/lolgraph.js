const cheerio = require('cheerio');
const request = require('request');
const { upperFirst } = require('lodash');

const url = 'http://www.leagueofgraphs.com/champions/';

function extractSpellFromElement(el){    
    return el.attr('tooltip-var').split('-').pop()               
}

function parseSpellsPage($) {
    selector  = "img[class*='requireTooltip spell-'] "    
    
    return $(selector)
          .toArray()
          .map(x => extractSpellFromElement($(x)))
          .slice(0,2)
}

function extractSpells(champion, position, callback) {
    const spellUrl = _getUrl(champion, position, 'spells');

    request.get(spellUrl, (error, response, html) => {
        if (!error && response.statusCode === 200) {
            summSpells = parseSpellsPage(cheerio.load(html));
            callback(summSpells);        
        }
    });
}

function extractRunesFromElement($, champion, position){    
    const getPerkIdFromImg = (_, elem) =>
        $(elem)
        .attr('src')
        .split('/')
        .slice(-1)
        .pop()
        .split('.')[0];

    return (runePageElement, index) => {
        
        const name = `${upperFirst(champion.toLowerCase())} ${upperFirst(position.toLowerCase().replace('/iron','').replace('silver/',''))}`;

        const primaryPerkIds = $(runePageElement)
        .find('tr th img')
        .map(getPerkIdFromImg)
        .get();

        let subStyleOpacite = [];

        const selectedPerkIds =             
            $(runePageElement)
            .find(".img-align-block div img[style*='opacity:']")           
            .filter(function(i, el) {
                // this === el                

                //Pas beau mais fonctionnel
                
                let runesLine = $(this).parent()
                
                while (runesLine.get(0).tagName !== 'tr' ) {
                    runesLine = runesLine.parent()
                }

                runesLine = runesLine.find(".img-align-block div img[style*='opacity:']");

                //Pour chaque line de rune on cherche le maximum d'opacité
                max_opa = parseFloat($(runesLine[0]).attr('style').split(':').pop())
                max_src = $(runesLine[0]).attr("src")
                
                for (let j = 1; j < runesLine.length; j++) {
                    let tmp_opa = parseFloat($(runesLine[j]).attr('style').split(':').pop())
                    if (tmp_opa > max_opa) {
                        max_opa = parseFloat($(runesLine[j]).attr('style').split(':').pop())
                        max_src = $(runesLine[j]).attr("src")
                    }
                } 
                
                //A chaque fois qu'on trouve le plus opqaue d'une ligne, on push
                if (max_src == $(this).attr("src")) subStyleOpacite.push(max_opa);
                
                return max_src == $(this).attr("src");
            }) 
            .map(getPerkIdFromImg)
            .get()

            //On cherche le moins plus opaque du 2eme arbres           

            let indexOfMaxValue = subStyleOpacite.slice(4, 7).reduce((iMax, x, i, arr) => x < arr[iMax] ? i : iMax, 0)
            
            selectedPerkIds.splice(indexOfMaxValue + 4, 1)
        return {
            name,
            primaryStyleId: primaryPerkIds[0],
            subStyleId: primaryPerkIds[1],
            selectedPerkIds
        };
    };             
}

function parseRunesPage($, champion, position) {
    selector  = "table[class='data_table perksTable'] "    
    
    return $(selector)
          .toArray()
          .map(extractRunesFromElement($, champion, position))
          .shift()
}

function extractRunes(champion, position, callback) {
    const runesUrl = _getUrl(champion, position, 'runes');

    request.get(runesUrl, (error, response, html) => {
        if (!error && response.statusCode === 200) {
            page = parseRunesPage(cheerio.load(html), champion, position);
            callback(page);        
        }
    });
}

function _getUrl(champion, role, type) {
    return url + type + '/' + champion + '/' + role;
}

function _getSpells(champion, role) {
    return new Promise(resolve => {
        extractSpells(champion, role, spells => resolve(spells));
    })    
}

function _getRunes(champion, role) {
    return new Promise(resolve => {
        extractRunes(champion, role, runes => resolve(runes));
    })     
}

function parseRolePage($) {
    selector  = "div[class='rolesEntries'] "    
    
    return $(selector)
          .toArray()
          .map(x => $(x).find('a').attr('href').split('/').slice(-1)[0])
          .shift()
}

function getMainRole(champion) {
    const roleUrl = _getUrl(champion, '', 'overview');
    
    return new Promise(resolve => {
        request.get(roleUrl, (error, response, html) => {
            if (!error && response.statusCode === 200) {
                let role =  parseRolePage(cheerio.load(html))
                console.log('Main Role', role)
                resolve(role);      
            }
        });
    })    
}

async function _getLoadout(champion, role, callback) {
    let t_role = role;
    
    if (t_role == '') await getMainRole(champion).then(main_role => t_role = main_role);
    
    //de base pour l'aram on descend a silver pour pas se baser sur 3 games..
    if (role == 'aram') t_role = 'silver/'+ role; 

    let graphUrl      = _getUrl(champion, t_role, 'overview');    
    let promiseRunes  = _getRunes(champion, t_role);
    let promiseSpells = _getSpells(champion, t_role);

    Promise.all([promiseRunes, promiseSpells]).then(async results => {
        let page = results[0];
        let summ = results[1];
        
        //Parfois on ne trouve pas de page, dans ce cas on descend dans les abimes du fer
        if (!page) {
            console.log('Pas de page, nouvelle recherche');
            if (role == 'aram') t_role = 'iron/'+ role
            else t_role = role + '/iron';

            graphUrl      = _getUrl(champion, t_role, 'overview');    
            promiseRunes  = _getRunes(champion, t_role);
            promiseSpells = _getSpells(champion, t_role);

            await Promise.all([promiseRunes, promiseSpells]).then(ironResults => {
                page = ironResults[0];
                summ = ironResults[1];    
            })
        } 
        
        if (summ.length == 0) {
            //Si on trouve pas de summoners...
            if (role == 'aram') summ = [32, 4] //Snowball
            else summ = [14, 4]
        }

        callback({
            new_url : graphUrl,
            new_page: page,
            new_summ: summ
        });       
    })
}

module.exports = { _getLoadout, getMainRole};