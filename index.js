const https = require('https');
const twitterAuth = require('./secret.js');
const fs = require('fs');
const path = require('path');

const Twitter = require('twitter');

var db = {};
var words = [];

const dbPath = path.join(__dirname, 'db.json');

function loadDatabase(cb) {
    if(fs.existsSync(dbPath)) {
        console.log("Loading last bot state...");
        fs.readFile(dbPath, function(err, data) {
            if(err) throw err;
            let json = data.toString();
            db = JSON.parse(json);

            if(!("lastHour" in db)) db.lastHour = new Date().getHours() - 1;
            if(!("leafiesUsed" in db)) db.leafiesUsed = [];

            cb();
        });
    } else {
        console.log("Creating initial bot state.");
        db = {
            lastHour: new Date().getHours() - 1,
            leafiesUsed: []
        };
        saveDatabase(cb);
    }
}

function saveDatabase(cb) {
    console.log("Saving bot state to disk...");
    let json = JSON.stringify(db, null, 4);
    fs.writeFile(dbPath, json, cb);
}

// function that downloads a list of every single english word
function getWords(cb) {
    // this is where the spondooly is.
    let url = 'https://raw.githubusercontent.com/words/an-array-of-english-words/master/index.json';

    console.log(`Downloading list of english words from ${url}...`);

    // Empty out the current list of words...
    words = [];

    // REACH OUT, TOUCH FAITH
    https.get(url, (res) => {
        let data = "";

        res.on('data', (chunk) => {
            data += chunk;
        })

        res.on('end', () => {
            let wordList = JSON.parse(data);
            wordList.sort();
            for(let word of wordList) {
                let trimmed = word.trim();
                if(trimmed.length > 1 || trimmed == 'a') {
                    words.push(trimmed);
                }
            }
            console.log(`Done. Word list size: ${words.length} elements`);
            cb();
        });
    });
}

function getLeafy() {
    let leafy = "";
    for(let word of words) {
        let lowercase = word.trim().toLowerCase();
        if(lowercase != "here" && isNaN(lowercase.substr(0, 1))) {
            if(!db.leafiesUsed.includes(lowercase)) {
                db.leafiesUsed.push(lowercase);
                leafy = lowercase;
                break;
            }
        }
    }

    if(leafy.trim().length > 0) {
        let first = leafy.substr(0, 1);
        let rest = leafy.substr(1);
        let capitalized = first.toUpperCase() + rest;
        leafy = capitalized;
    } else {
        if(!db.leafiesUsed.includes("here")) {
            db.leafiesUsed.push("here");
            leafy = "Here";
        }
    }

    if(leafy.length > 0) {
        return `LeafyIs${leafy}`;
    } else {
        return null;
    }
}

function tweetWord(client) {
    db.lastHour = new Date().getHours();

    let leafy = getLeafy();
    if(leafy != null) {
        console.log(`Tweeting: ${leafy}`);
        client.post('statuses/update', {status: leafy},  function(error, tweet, response) {
            if(error) throw error;
            console.log("Tweet was successful.");
            saveDatabase(function() {
                console.log("See you in an hour.");
                setTimeout(() => tweetWord(client), 3600000);
            });
        });
    }
}

function startBot() {
    loadDatabase(function() {
        var client = new Twitter({
            consumer_key: twitterAuth.consumerKey,
            consumer_secret: twitterAuth.consumerSecret,
            access_token_key: twitterAuth.accessToken,
            access_token_secret: twitterAuth.accessTokenSecret
        });
    
        var date = new Date();
        var hour = date.getHours();

        console.log(`Leafies tweeted so far: ${db.leafiesUsed.length}`);

        if(hour != db.lastHour) {
            tweetWord(client);
        } else {
            console.log("See you in an hour.");
            setTimeout(() => tweetWord(client), 3600000);
        }
    });
}

getWords(startBot);