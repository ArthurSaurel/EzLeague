const cheerio = require('cheerio');
const request = require('request');
const { upperFirst } = require('lodash');

const url = 'http://www.op.gg/champion/';

function extractRunePagesFromElement($, champion, position) {
  const getPerkIdFromImg = (_, elem) =>
    $(elem)
      .attr('src')
      .split('/')
      .slice(-1)
      .pop()
      .split('.')[0];

  return (runePageElement, index) => {
    const stats = $(runePageElement)
      .find('.champion-overview__stats strong')
      .map((i, elem) => $(elem).text())
      .get();


    const name = `${champion} ${upperFirst(position.toLowerCase())}`;

    const styles = $(runePageElement)
      .find('.champion-overview__data .perk-page .perk-page__item--mark img')
      .map(getPerkIdFromImg)
      .get();

    // normal runes
    let selectedPerkIds = $(runePageElement)
      .find('.champion-overview__data .perk-page .perk-page__item--active img')
      .map(getPerkIdFromImg)
      .get();

    // stat shards
    selectedPerkIds = selectedPerkIds.concat(
      $(runePageElement)
        .find('.champion-overview__data .fragment-page img.active')
        .map(getPerkIdFromImg)
        .get()
    );

    return {
      name,
      primaryStyleId: styles[0],
      subStyleId: styles[1],
      selectedPerkIds
    };
  };
}

function extractSpellFromElement(a){    
    return a.find('img').attr('src').split('/').slice(-1)[0].split('.')[0]                
}

function parseSummSpells($) {
    selector  = "table[class*='champion-overview__table champion-overview__table--summonerspell'] "
              + "tbody tr td[class='champion-overview__data'] ul[class='champion-stats__list'] li[class='champion-stats__list__item']"
    
    return $(selector)
          .toArray()
          .map(x => extractSpellFromElement($(x)))
          .slice(0,2)
}

function parsePage($, champion, position) {
  return $("tbody[class*='ChampionKeystoneRune-'] tr")
    .toArray()
    .map(extractRunePagesFromElement($, champion, position));
}

function parseSinglePage($, champion, position, pageType) {
  const element = $("tbody[class*='ChampionKeystoneRune-'] tr").get(pageType);
  return extractRunePagesFromElement($, champion, position)(element, pageType);
}

function extractLoadout(champion, position, callback) {
    const opggUrl = _getUrl(champion, position);

    request.get(opggUrl, (error, response, html) => {
        if (!error && response.statusCode === 200) {
            page = parsePage(cheerio.load(html), champion, position)[0];
            summSpells = parseSummSpells(cheerio.load(html));

            callback({
                new_url : opggUrl,
                new_page: page,
                new_summ: summSpells
            });        
        }
    });
}

function _getUrl(champion, role) {
    return url + champion + '/statistics/' + upperFirst(role);
}

function _getLoadout(champion, role, callback) {
  const runePages = { };

  extractLoadout(champion, role, function(loadout) {
    callback(loadout);
  });
}

module.exports = { _getLoadout, _getUrl };