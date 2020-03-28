const https = require('https');
const twitterAuth = require('./secret.js');

const Twitter = require('twitter');


var words = [];

// function that downloads a list of every single english word
function getWords(cb) {
    // this is where the spondooly is.
    let url = 'https://raw.githubusercontent.com/dwyl/english-words/master/words.txt';

    // Empty out the current list of words...
    words = [];

    // REACH OUT, TOUCH FAITH
    https.get(url, (res) => {
        let data = "";

        res.on('data', (chunk) => {
            data += chunk;
        })

        res.on('end', () => {
            let wordList = data.split("\n");
            for(let word of wordList) {
                let trimmed = word.trim();
                words.push(trimmed);
            }
            cb();
        });
    });
}

function getLeafy() {
    let word = words[Math.floor(Math.random() * words.length)];

    let first = word.substr(0, 1)
    let rest = word.substr(first.length);

    word = first.toUpperCase() + rest;

    return `LeafyIs${word}`;
}

function tweetWord(client) {
    client.post('statuses/update', {status: getLeafy()},  function(error, tweet, response) {
        if(error) throw error;
        console.log(tweet);  // Tweet body.
        console.log(response);  // Raw response object.

        setTimeout(() => tweetWord(client), 86400000);
      });
}

function startBot() {
    var client = new Twitter({
        consumer_key: twitterAuth.consumerKey,
        consumer_secret: twitterAuth.consumerSecret,
        access_token_key: twitterAuth.accessToken,
        access_token_secret: twitterAuth.accessTokenSecret
    });

    tweetWord(client);
}

getWords(startBot);