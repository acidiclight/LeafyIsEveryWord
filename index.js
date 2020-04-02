const https = require('https');
const twitterAuth = require('./secret.js');
const fs = require('fs');
const path = require('path');

const Twitter = require('twitter');

var db = {};
var words = require('an-array-of-english-words').sort().filter(x=>x.toLowerCase() == "a" || x.length >= 2);

const dbPath = path.join(__dirname, 'db.json');

function loadDatabase(cb) {
    if(fs.existsSync(dbPath)) {
        console.log("Loading last bot state...");
        fs.readFile(dbPath, function(err, data) {
            if(err) throw err;
            let json = data.toString();
            db = JSON.parse(json);

            let changed = false;

            if(!db.lastTweeted) {
                db.lastTweeted = new Date();
                changed = true;
            }
            if(!("leafiesUsed" in db)) {
                db.leafiesUsed = [];
                changed = true;
            } 

            if(changed) {
                saveDatabase(cb);
            } else {
                cb();
            }
        });
    } else {
        console.log("Creating initial bot state.");
        db = {
            lastTweeted: new Date(),
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
    db.lastTweeted = new Date();

    let leafy = getLeafy();
    if(leafy != null) {
        console.log(`Tweeting: ${leafy}`);
        client.post('statuses/update', {status: leafy},  function(error, tweet, response) {
            if(error) throw error;
            console.log("Tweet was successful.");
            saveDatabase(function() {
                console.log("See you in an hour.");
                setTimeout(() => tweetWord(client), (1000 * 60) * 15);
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

        var timespan = date.getTime() - new Date(db.lastTweeted).getTime();
        var minutesSince = timespan / (1000 * 60);

        console.log(`Leafies tweeted so far: ${db.leafiesUsed.length}`);

        if(minutesSince > 15) {
            tweetWord(client);
        } else {
            console.log("See you in a bit.");
            setTimeout(() => tweetWord(client), (1000 * 60) * 15);
        }
    });
}

startBot();