'use strict'

const express = require('express');
const GenerateStats = require('./modules-local/generate-stats');
const config = {
  products: ['Core', 'External Software Affecting Firefox',
             'Firefox', 'Firefox for iOS', 'Firefox for Android',
             'NSPR', 'NSS', 'Toolkit'],
  exclude: ['build conf', 'ca cert'], // components to exclude, can be partial strings
  versions: [
    {number: 61, mergedate: '2018-03-12', betadate: '2018-05-07'},
    {number: 62, mergedate: '2018-05-07', betadate: '2018-06-26'}
  ]
};
var   data = {stats: false, message: 'not ready, please refetch'};
const hourly = 60*60*1000;

// Method to periodically run to generate stats

function update() {
  var myStats = new GenerateStats(config);

  myStats.then(stats => {
    console.log(stats.report);
    data = {stats: stats, message: 'ok'};
  });
}

var timeout = setInterval(update, hourly);

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
var listener = app.listen(process.env.PORT || 8080, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
