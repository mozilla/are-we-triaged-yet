'use strict';

const fetch   = require('node-fetch');
const isArray = require('util').isArray;
const argv    = require('minimist')(process.argv.slice(2));
const moment  = require('moment');
const mergedate = moment.utc(argv.mergedate) || false;
const version = argv.version;
var   results = [];
var   counts  = [];
var   days, day;
var   formattedMergedate;

if(!argv.mergedate || !argv.version) {
    console.log("Usage: historical-triaged.js --mergedate=YYYY-MM-DD --version=NN");
    return 1;
} 

formattedMergedate = mergedate.format('YYYY-MM-DD');
days = moment.utc().diff(mergedate, 'days');

console.log(`Historical Uplifts by Date for Firefox ${version}: Merged on ${formattedMergedate}, ${days} Days ago`);

for (var i = 0; i < days; i++) {
    day = mergedate.add(1, 'days');
    let formattedDay = day.format('YYYY-MM-DD');
    results.push(fetch(`https://bugzilla.mozilla.org/rest/bug?include_fields=id&chfield=cf_status_firefox${version}&chfieldfrom=${formattedMergedate}&chfieldto=${formattedDay}&chfieldvalue=fixed&f2=flagtypes.name&f5=attachments.ispatch&o2=equals&v2=approval-mozilla-beta%2B`)
    .then(response => {
        if (response.ok) {
            response.json()
            .then(data => {
                counts.push({
                    date: formattedDay,
                    count: data.bugs.length
                });
            })
        }
    })
    .catch(err => {
        console.error(err);
    }));
}

return Promise.all(results).then(() => {
    counts.sort((a, b) => {
        return (moment(a.date) - moment(b.date));
    });

    console.log(counts);
})
.catch(err => console.log(err));