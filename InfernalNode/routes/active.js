var express = require('express');
var router = express.Router();
var fs = require('fs');
var nrc = require('node-run-cmd');

var utmconv = require('../domain/utm.js')

const pathToGroupMappingFile = 'C:/Users/cerea/Dropbox/custom missions/DCS RPG TTI/DCS TTI NTTR/2.0/PersistenceGroupMapping.json'
const pathToActiveUnits = 'C:/Users/cerea/Documents/Topper/pynfernal/Temp/jsonActiveUnits.json'
const dZ = 693996.81
const dX = 4410028.064

utmconv.setDatum(0)

let computing = false

var cachedActiveUnits = {}
precacheActiveUnits()

/* GET home page. */
router.get('/units', function(req, res, next) {
    precacheActiveUnits()
    if (cachedActiveUnits) {
        res.status(200).send(cachedActiveUnits)
    } else {
        res.status(501).send("Can't find active Units")
    }
});

router.get('/aos', function(req, res, next) {
    activeAOs = getActiveAOs()
    if (activeAOs) {
        res.status(200).send(activeAOs)
    } else {
        res.status(501).send("Can't find active AOs")
    }
})

function getGroupData() {
    var obj = fs.readFileSync(pathToGroupMappingFile, 'utf8')
    obj = JSON.parse(obj)
    return obj
}

function precacheActiveUnits() {
    if (computing) {
        return
    }
    computing = true
    let success = computeActiveUnits()
    setTimeout(function() {
        let activeUnits = getActiveUnits()
        cachedActiveUnits = activeUnits
        computing = false
    }, 5000);
}

function computeActiveUnits() {
    var options = { cwd: 'C:/Users/cerea/Documents/Topper/pynfernal/' };
    nrc.run('python active.py dump', options)
    .then(function(exitCodes) {
        return true
    }, function(err) {
        console.log('Command failed to run with error: ', err);
        return false
    });
}

function getActiveUnits() {

    var obj = fs.readFileSync(pathToActiveUnits, 'utf8')
    obj = JSON.parse(obj)
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var element = obj[key];
            let x = Math.abs(element['x'])
            let utmY = dX - x
            let z = Math.abs(element['z'])
            let utmX = dZ - z
            
    
            let latlon = utmconv.utmToLatLng(utmX, utmY, 11, false)
            let lat = latlon['lat']
            let lon = latlon['lng']
    
            element['lat'] = lat
            element['lon'] = lon
        }
    }
    return obj
}

function getActiveAOs() {
    let activeAOs = []
    let groupData = getGroupData()
    
    groupData["lines"].forEach(function(line) {
        let AOWasFound = false
        line["AOs"].forEach(function(AO) {
            let AOFound = false
            let groupCounter = 0
            AO["groups"].forEach(function(group) {
                let groupId = group["groupId"]
                for (var key in cachedActiveUnits) {
                    if (cachedActiveUnits.hasOwnProperty(key)) {
                        var unit = cachedActiveUnits[key]
                        if (unit["groupId"] == groupId) {
                            AOFound = true
                            groupCounter++
                        }
                    }
                }
            }, this);
            activeAOs.push({
                "name" : AO['AOName'],
                "coordinates" : AO['coordinates'],
                "frontline" : AO['frontline'],
                "side" : AO['side'],
                "status" : AOFound ? AOWasFound ? "ACTIVE" : "FRONTLINE" : "DESTROYED",
                "group_counter" : groupCounter
            })
            AOWasFound = AOFound
        }, this);
    }, this);
    return activeAOs
}

module.exports = router
