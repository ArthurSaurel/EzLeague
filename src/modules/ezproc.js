const api = require('../lcu-api');
const main = require('../index.js');

function accept() {
    api.post('/lol-matchmaking/v1/ready-check/accept')
    .then( () => {
        main.log('Proc Accepted');
    })
    .catch(err => main.log(err));
}

module.exports = {accept};