'use strict'

const express = require('express');
const GenerateStats = require('./modules-local/generate-stats');
const versions = [
    {number: 59, mergedate: '2017-11-13', betadate: '2018-01-22'},
    {number: 60, mergedate: '2018-01-22', betadate: '2018-03-12'}
];
var   data = {stats: false, message: 'not ready, please refetch'};
const hourly = 60*60*1000;

// Method to periodically run to generate stats

function update() {
  var myStats = new GenerateStats(versions);

  myStats.then(stats => {
    console.log(stats.report);
    data = {stats: stats, message: 'ok'};
  });
}

var timeout = setTimeout(update, hourly);

// get first set of data
update();

var app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/data", function (request, response) {
  response.send(data);
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
