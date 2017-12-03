var express = require('express');
var router = express.Router();
var fs = require('fs');
var nrc = require('node-run-cmd');

const pathToPlayersStats = 'C:/Users/cerea/Documents/Topper/pynfernal/Temp/playerStats.json'

let computing = false

var cachedPlayerStats = {}
precachePlayersStats()

router.get('/stats', function (req, res, next) {
    precachePlayersStats()
    if (cachedPlayerStats) {
        let obj = reduceData(cachedPlayerStats)
        res.status(200).send(obj)
    } else {
        res.status(501).send("Can't find stats")
    }
});

router.get('/leaders', function (req, res, next) {
    precachePlayersStats()
    if (cachedPlayerStats) {
        let obj = leadersData(cachedPlayerStats)
        res.status(200).send(obj)
    } else {
        res.status(501).send("Can't find stats")
    }
})

function precachePlayersStats() {
    if (computing) {
        return
    }
    computing = true
    let success = computePlayersStats()
    setTimeout(function() {
        let playersStats = getPlayersStats()
        cachedPlayerStats = playersStats
        computing = false
    }, 5000);
}

function computePlayersStats() {
    var options = { cwd: 'C:/Users/cerea/Documents/Topper/pynfernal/' };
    nrc.run('python stats.py dump', options)
    .then(function(exitCodes) {
        return true
    }, function(err) {
        console.log('Command failed to run with error: ', err);
        return false
    });
}

function getPlayersStats() {
    var obj = fs.readFileSync(pathToPlayersStats, 'utf8')
    obj = JSON.parse(obj)
    return obj
}

function leadersData(data) {
    let leaders = []

    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            let player = data[key]
            let name = player.names[Object.keys(player.names).length]
            let friendlyHits =  Object.keys(player.friendlyHits).length
            let losses = player.losses.crash + player.losses.eject + player.losses.pilotDeath
            let kills = 0
            let totalTime = 0
            let flightTime = 0

            for (let airframe in player.times) {
                flightTime += player.times[airframe]["inAir"];
                totalTime += player.times[airframe]["total"];
            }

            for (let weapons in player.weapons) {
                kills += player.weapons[weapons].kills;
            }

            leaders.push({
                "id" : key,
                "name" : name,
                "friendly_hits" : friendlyHits,
                "losses" : losses,
                "total_kills" : kills,
                "flight_time" : flightTime,
                "total_time" : totalTime,
            })
        }
    }
    leaders = leaders.sort(function(a, b) {
        return a.friendly_hits < b.friendly_hits
    })
    return leaders
}

function reduceData(data) {
    let stat = {
        uniquePlayer: 0,
        friendlyHits: 0,
        totalFlightTime: "",
        totalGroundTime: "",
        totalTime: "",
        crash: 0,
        eject: 0,
        death: 0,
        totalKill: 0,
        weapons: {},
        airplane: {}
    };

    let ttft = 0;
    let ttt = 0;

    for (let key in data) {
        let player = data[key];

        stat.uniquePlayer++;

        for (let i in player.friendlyHits) {
            stat.friendlyHits++;
        }

        for (let airframe in player.times) {
            ttft += player.times[airframe]["inAir"];
            ttt += player.times[airframe]["total"];
        }

        for (let i in player.losses) {
            stat.crash += player.losses["crash"];
            stat.eject += player.losses["eject"];
            stat.death += player.losses["pilotDeath"];
        }

        for (let weapons in player.weapons) {
            stat.totalKill += player.weapons[weapons].kills;
        }

        for (let weaponName in player.weapons) {

            if(stat.weapons.hasOwnProperty(weaponName)){
                stat.weapons[weaponName].kills += player.weapons[weaponName].kills;
                stat.weapons[weaponName].shot += player.weapons[weaponName].shot;
            }else{
                stat.weapons[weaponName] = {};
                stat.weapons[weaponName].kills = player.weapons[weaponName].kills;
                stat.weapons[weaponName].shot = player.weapons[weaponName].shot;
            }

        }

        for (let airframe in player.times){

            if(stat.airplane.hasOwnProperty(airframe)){
                stat.airplane[airframe].inAir += player.times[airframe].inAir;
                stat.airplane[airframe]. total += player.times[airframe].total;
            }else{
                stat.airplane[airframe] = {};
                stat.airplane[airframe].inAir = player.times[airframe].inAir;
                stat.airplane[airframe]. total = player.times[airframe].total;
            }

        }

    }

    stat.totalFlightTime = secondsToString(ttft);
    stat.totalGroundTime = secondsToString(ttt - ttft);
    stat.totalTime = secondsToString(ttt);

    for (let airframe in stat.airplane){
        stat.airplane[airframe].inAir = secondsToString(stat.airplane[airframe].inAir);
        stat.airplane[airframe].total = secondsToString(stat.airplane[airframe].total);
    }

    function secondsToString(seconds) {

        let numdays = Math.floor(seconds / 86400);
        let numhours = Math.floor((seconds % 86400) / 3600);
        let numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
        let numseconds = Math.floor(((seconds % 86400) % 3600) % 60);

        return numdays + "d " + numhours + "h " + numminutes + "m " + numseconds + "s";

    }

    return stat
}

module.exports = router