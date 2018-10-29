'use strict'

const express = require('express');
const GenerateStats = require('./modules-local/generate-stats');
var   schedule = require('node-schedule');
const config = {
  products: ['Core', 'External Software Affecting Firefox',
             'Firefox', 'Firefox for iOS', 'Firefox for Android',
             'DevTools', 'NSPR', 'NSS', 'WebExtensions', 'Toolkit'],
  exclude: ['build conf', 'ca cert'], // components to exclude, can be partial strings
  versions: [
<<<<<<< HEAD
    {number: 63, mergedate: '2018-06-25', betadate: '2018-09-04'},
    {number: 64, mergedate: '2018-09-04', betadate: '2018-10-23'},
    {number: 65, mergedate: '2018-10-22', betadate: '2018-12-10'}
=======
    {name: 'release', number: 63, mergedate: '2018-06-25', betadate: '2018-09-04'},
    {name: 'beta', number: 64, mergedate: '2018-09-04', betadate: '2018-10-23'},
    {name: 'nightly', number: 65, mergedate: '2018-10-22', betadata: '2018-12-10'}
>>>>>>> 5049495... #65 update column definitions
  ]
};
var   data = {stats: false, message: 'not ready, please refetch'};
var   nightly = config.versions[2].number;

// Method to periodically run to generate stats

function update() {
  var myStats = new GenerateStats(config);

  myStats.then(stats => {
    console.log(stats.report);
    data = { message: 'ok', nextUpdate: j.nextInvocation(), lastUpdate: new Date(), stats: stats};
  });
}

// update at midnight
var rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 0;

var j = schedule.scheduleJob(rule, update);

// get first set of data
update();

var app = express();

app.use(express.static('public'));

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/counts", function(request, response) {
  response.sendFile(__dirname + '/views/counts.html');
});

app.get("/summary", function(request, response) {
  response.sendFile(__dirname + '/views/summary.html');
});

app.get("/text", function(request, response) {
  var msg;

  if (data.message === 'ok') {
    msg = `I'm afraid we aren't triaged yet.
          There are ${data.stats.versions[nightly].untriaged.count} untriaged bugs in nightly.`;
  } else {
    msg = "I'm still collecting data, please try again later.";
  }
  
  response.send(msg);
});

app.get("/data", function (request, response) {
  response.send(data);
});

// listen for requests :)
var listener = app.listen(process.env.PORT || 8080, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
