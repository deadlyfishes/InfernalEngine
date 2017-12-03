var express = require('express');
var router = express.Router();
var fs = require('fs');


const pathToWeatherFile = 'C:/Users/cerea/Documents/Topper/pynfernal/weather'

/* GET home page. */
router.get('/', function(req, res, next) {
    let weather = getWeatherData()
    if (weather) {
        res.status(200).send(weather)
    } else {
        res.status(501).send("Can't find weather")
    }
});

function getWeatherData() {
    var obj = fs.readFileSync(pathToWeatherFile, 'utf8')
    obj = JSON.parse(obj)
    return obj
}

module.exports = router;
