/* jshint -W097 */
/* jshint esversion: 6 */
/* jshint node: true */

"use strict";

const express = require('express');
const GenerateStats = require('./modules-local/generate-stats');
var   schedule = require('node-schedule');
const config = {
  products: ['Core', 'External Software Affecting Firefox',
             'Firefox', 'Firefox Build System', 'Firefox for iOS', 'Firefox for Android',
             'DevTools', 'GeckoView', 'NSPR', 'NSS', 'WebExtensions', 'Toolkit', 'Remote Protocol'],
  exclude: ['ca cert'], // components to exclude, can be partial strings
  types: ['defect'],
  versions: [
    {number: 78, mergedate: '2020-05-04', betadate: '2020-06-02', releasedate: '2020-06-30'},
    {number: 79, mergedate: '2020-06-02', betadate: '2020-06-30', releasedate: '2020-07-27'},
    {number: 80, mergedate: '2020-06-29', betadate: '2020-07-27', releasedate: '2020-08-24'}
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
rule.hour = 14;
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
