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
    {name: 'release', number: 63, mergedate: '2018-06-25', betadate: '2018-09-04'},
    {name: 'beta', number: 64, mergedate: '2018-09-04', betadate: '2018-10-23'},
    {name: 'nightly', number: 65, mergedate: '2018-10-22', betadata: '2018-12-10'}
  ]
};
var   data = {stats: false, message: 'not ready, please refetch'};

var   nightly = config.versions[2].number;
var   beta    = config.versions[1].number;
var   release = config.versions[0].number;

// init sqlite db
var fs = require('fs');
var dbFile = './.data/sqlite.db';
var exists = fs.existsSync(dbFile);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dbFile);

// Method to periodically run to generate stats

function update() {
  var myStats = new GenerateStats(config);

  myStats.then(stats => {
    console.log(stats.report);
    data = { message: 'ok', nextUpdate: j.nextInvocation(), lastUpdate: new Date(), stats: stats};   
    serializeData(data);
    
  });
}

function isNewDay(data) {
  return true; 
}

/*
  Takes the data object and writes it to our Sqlite store
*/
function serializeData(data) {
  var newRecords = []; // new records is an array of data objects to insert into the table
                       // one for each combination of version x report x age bucket
  var date, name, dates;
  
  // because we don't have a lot of control over restarts in the Glitch and Heroku envs
  // we don't want to write the same day over and over so first look for the last date of data
  // and compare that to the current day of data and only then write to the datbase
  
  if (data.message === "ok" && isNewDay(data)) {
    dates = Object.keys(data.stats.bugCounts.dates);
    date = dates[dates.length - 2];
    console.log("date", date);
    Object.keys(data.stats.versions).forEach(version => {
      name = config.versions.filter(v => { return (v.number === parseInt(version, 10)) } )[0].name;
      Object.keys(data.stats.versions[version]).forEach(report => {
        newRecords.push({
          date: date, version: version, name: name, report: report, 
          bucket: 'all', count: data.stats.versions[version][report].count
        });
        Object.keys(data.stats.versions[version][report].ages).forEach(bucket => {
          newRecords.push({
            date: date, version: version, name: name, report: report, bucket: bucket, 
            count: data.stats.versions[version][report].ages[bucket]
          });          
        });
      });
    });
    

  newRecords.forEach(record => {
    db.serialize(function(){
      db.run(`INSERT INTO History VALUES ('${record.date}', '${record.version}', '${record.name}', '${record.report}', '${record.bucket}', '${record.count}')`, []); 
      });
    });

  }
}

// update at 01:00 UTC
var rule = new schedule.RecurrenceRule();
rule.hour = 1;
rule.minute = 0;

var j = schedule.scheduleJob(rule, update);

// if ./.data/sqlite.db does not exist, create it
db.serialize(function(){
  if (!exists) {
    db.run('CREATE TABLE History (date TEXT, version INTEGER, name TEXT, report TEXT, bucket TEXT, count INTEGER)');
    console.log('New table History created!');
  }
  else {
    console.log('Database "History" ready to go!');
  }
});  

// get first set of data
update();

var app = express();

app.use(express.static('public'));

app.get("/", (request, response) => {
  response.sendFile(__dirname + '/views/index.html');
}); 

app.get("/counts", (request, response) => {
  response.sendFile(__dirname + '/views/counts.html');
});

app.get("/summary", (request, response) => {
  response.sendFile(__dirname + '/views/summary.html');
});

app.get("/text", (request, response) => {
  var msg;

  if (data.message === 'ok') {
    msg = `I'm afraid we aren't triaged yet.
          There are ${data.stats.versions[nightly].untriaged.count} untriaged bugs in nightly.`;
  } else {
    msg = "I'm still collecting data, please try again later.";
  }
  
  response.send(msg);
});

app.get("/data",  (request, response) => {
  response.send(data);
});

app.get("/history", (request, response) => {
  db.all('SELECT * from History', function(err, rows) {
    response.send({ history: rows });
  });
});

var listener = app.listen(process.env.PORT || 8080, function () {
  console.log('Your app is listening on port ' + listener.address().port);
}); 