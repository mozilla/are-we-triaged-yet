/* jshint -W097 */
/* jshint esversion: 6 */
/* jshint node: true */

'use strict';

const fetch = require('node-fetch');
const moment = require('moment');
const isArray = require('util').isArray;
const BASEURL = "https://bugzilla.mozilla.org/rest/bug?";

var GenerateStats = function(config) {
    var stats = {
      versions:   {}
    };
    var requests = [];
    var versions, typeList, productList = '', exclusionList = 'none';

    if(config.versions && isArray(config.versions))
    {
        versions = config.versions;
    } else {
        throw(new Error('Must specify an array of versions'));
    }
    
    if (config.products && isArray(config.products)) {
        productList = config.products.reduce((list, product) => {
            return list + '&product=' + encodeURIComponent(product);
        }, '');
    }

    if (config.types && isArray(config.types)) {
        typeList = config.types.reduce((list, type) => {
            return list + '&bug_type=' + encodeURIComponent(type);
        }, '');
    }

    if (config.exclude && isArray(config.exclude)) {
        exclusionList = encodeURIComponent(config.exclude.reduce((list,component) => {
            return list + ',' + component;
        }, ''));
    }

    /* 
    Count bugs filed in last week
    */

    requests.push(fetch(`https://bugzilla.mozilla.org/rest/bug?include_fields=id,creation_time,status,resolution,component,product&chfield=%5BBug%20creation%5D&chfieldfrom=-2w&chfieldto=Now&email1=intermittent-bug-filer%40mozilla.bugs&emailreporter1=1&emailtype1=notequals&f1=component&f2=bug_severity&keywords=meta&keywords_type=nowords&limit=0&o1=nowordssubstr&o2=notequals${productList}&short_desc=%5E%5C%5Bmeta%5C%5D&short_desc_type=notregexp&v1=${exclusionList}&v2=enhancement`)
        .then(response => {
            if (response.ok) {
                response.json()
                .then(data => {
                    processData(data);
                });
            }
        })
        .catch(err => {
            console.error(err);
        })
    );

    function processData(data) {
        var dateString;
        var dateFiled;
        var counts = {
            dates: {},
            products: {}
        };
        var list = [];
        
        data.bugs.forEach(bug => {
            // count dates
            dateFiled = new Date(bug.creation_time);
            dateString = [dateFiled.getUTCFullYear(), dateFiled.getUTCMonth()+1, dateFiled.getUTCDate()]
            .join('-');

            // overall counts
            if (counts.dates[dateString]) {
                counts.dates[dateString] ++;
            } else {
                counts.dates[dateString] = 1;
            }

            // product counts
            if (counts.products[bug.product]) {
                if (counts.products[bug.product].dates[dateString]) {
                    counts.products[bug.product].dates[dateString] ++;
                } else {
                    counts.products[bug.product].dates[dateString] = 1;
                }
            } else {
                counts.products[bug.product] = {};
                counts.products[bug.product].dates = {};
                counts.products[bug.product].components = {};
                counts.products[bug.product].dates[dateString] = 1;
            }

            // component counts
            if (counts.products[bug.product].components[bug.component]) {
                if (counts.products[bug.product].components[bug.component].dates[dateString]) {
                    counts.products[bug.product].components[bug.component].dates[dateString] ++;
                } else {
                    counts.products[bug.product].components[bug.component].dates[dateString] = 1;
                }
            } else {
                counts.products[bug.product].components[bug.component] = {};
                counts.products[bug.product].components[bug.component].dates = {};
                counts.products[bug.product].components[bug.component].dates[dateString] = 1;
            }
        });

        stats.bugCounts = counts;
    }

    /*
    Count categories
    */

    var version = versions[0];
    var mergedate  = version.mergedate;
    var betadate   = version.betadate;
    var versionStr = 'firefox' + version.number;


    var queries = [
        {
            name: 'all',
            title: 'Pending untriaged bugs (all types)',
            url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component,creation_time,keywords&bug_severity=--&bug_severity=N%2FA&bug_type=defect&chfield=%5BBug%20creation%5D&chfieldfrom=${mergedate}&classification=Client%20Software&classification=Developer%20Infrastructure&classification=Components&classification=Server%20Software&columnlist=opendate%2Cshort_desc%2Cpriority%2Cbug_severity%2Ctriage_owner%2Cproduct%2Ccomponent%2Cbug_status%2Cresolution%2Creporter%2Creporter_realname%2Cassigned_to%2Cchangeddate&email1=intermittent-bug-filer%40mozilla.bugs&email2=wptsync%40mozilla.bugs&emailreporter1=1&emailreporter2=1&emailtype1=notequals&emailtype2=notequals&resolution=---`
        },
        {
            name: 'needinfo',
            title: 'Pending untriaged w/needinfo (defects only)',
            url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component,creation_time,keywords&bug_severity=--&bug_severity=N%2FA&bug_type=defect&chfield=%5BBug%20creation%5D&chfieldfrom=${mergedate}&classification=Client%20Software&classification=Developer%20Infrastructure&classification=Components&classification=Server%20Software&columnlist=opendate%2Cshort_desc%2Cpriority%2Cbug_severity%2Ctriage_owner%2Cproduct%2Ccomponent%2Cbug_status%2Cresolution%2Creporter%2Creporter_realname%2Cassigned_to%2Cchangeddate&email1=intermittent-bug-filer%40mozilla.bugs&email2=wptsync%40mozilla.bugs&emailreporter1=1&emailreporter2=1&emailtype1=notequals&emailtype2=notequals&f1=flagtypes.name&o1=substring&resolution=---&v1=needinfo%3F`
        },
        {
            name: 'untriaged',
            title: 'Pending untriaged w/o needinfo (defects only)',
            url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component,creation_time,keywords&bug_severity=--&bug_severity=N%2FA&bug_type=defect&chfield=%5BBug%20creation%5D&chfieldfrom=${mergedate}&classification=Client%20Software&classification=Developer%20Infrastructure&classification=Components&classification=Server%20Software&columnlist=opendate%2Cshort_desc%2Cpriority%2Cbug_severity%2Ctriage_owner%2Cproduct%2Ccomponent%2Cbug_status%2Cresolution%2Creporter%2Creporter_realname%2Cassigned_to%2Cchangeddate&email1=intermittent-bug-filer%40mozilla.bugs&email2=wptsync%40mozilla.bugs&emailreporter1=1&emailreporter2=1&emailtype1=notequals&emailtype2=notequals&f1=flagtypes.name&o1=notsubstring&resolution=---&v1=needinfo%3F`
        }

    ];

    stats.versions[version.number] = {};

    var beta_merge_date = new moment(versions[1].mergedate);
    var nightly_merge_date = new moment(versions[2].mergedate);

    queries.forEach(query => {
        console.log (query.url);
        requests.push(fetch(query.url)
            .then(response => {
                if (response.ok)
                response.json()
                .then(data => {
                    var buglistAll;
                    if (query.showAll && query.showAll === true) {
                        buglistAll = query.buglist;
                    } else {
                        buglistAll = query.buglist + productList;
                    }
                    var ranks = rankComponents(data.bugs);
                    stats.versions[version.number][query.name] = {
                        title: query.title,
                        count: data.bugs.length,
                        ages:  ranks.ages,
                        ranks: ranks.ranks,
                        trains: ranks.trains
                    };
                });
            })
            .catch(err => {
                console.error(err + ', ' + query.name);
            })
        );
    });

    function rankComponents(bugs) {
        var ages = {};
        var trains = {};
        var buckets = {};
        var ranks = [];
        var now = moment.utc();

        bugs.forEach(bug => {
            // count components
            
            var component = bug.product + "::" + bug.component;

            // get age group
            var creation = new moment(bug.creation_time);
            var age = moment.duration(now.diff(creation)).asWeeks();
            var group;

            if (age <= 1) {
              group = 'lte_week';
            } else if (age <= 4) {
              group = 'lte_month';
            } else {
              group = 'gt_month';
            }

            if (ages[group]) {
              ages[group] ++;
            } else {
              ages[group] = 1;
            }

            // get train
            var train;

            if (creation >= nightly_merge_date) {
                train = 'nightly';
            } else if (creation >= beta_merge_date) {
                train = 'beta';
            } else {
                train = 'release';
            }

            if (trains[train]) {
                trains[train] ++;
            } else {
                trains[train] = 1;
            }

            if (!buckets[component]) {
              buckets[component] = {};
            }

            if (buckets[component].all) {
              buckets[component].all.count ++;
              buckets[component].all.bugs.push(bug.id);
            } else {
              buckets[component].all = {
                count: 1,
                bugs: [bug.id]
              };
            }
          
            if (buckets[component][group]) {
              buckets[component][group].count ++; 
              buckets[component][group].bugs.push(bug.id);
            } else {
              buckets[component][group] = {
                count: 1,
                bugs: [bug.id]
              };
            }

            if (buckets[component][train]) {
              buckets[component][train].count ++;
              buckets[component][train].bugs.push(bug.id);
            } else {
              buckets[component][train] = {
                count: 1,
                bugs: [bug.id]
              };
            }
        });
        
        // sort by total of bug older than a week
        
        Object.keys(buckets).forEach(component => {
            var componentName = component.split('\:\:');
            ranks.push({
                productName: componentName[0], componentName: componentName[1],
                component: component,
                lte_week: buckets[component].lte_week || { count: 0, bugs: [] },
                lte_month: buckets[component].lte_month || { count: 0, bugs: [] },
                gt_month: buckets[component].gt_month || { count: 0, bugs: [] },
                nightly: buckets[component].nightly || { count: 0, bugs: [] },
                beta: buckets[component].beta || { count: 0, bugs: [] },
                release: buckets[component].release || {count: 0, bugs: [] },
                all: buckets[component].all
            });
        });
        
        ranks.sort((a,b) => {
            return((b.gt_month.count + b.lte_month.count) - (a.gt_month.count + a.lte_month.count));
        });
        
        return { ranks: ranks, ages: ages, trains: trains};
    } 
    
    return Promise.all(requests).then(() => {
        return stats;
    })
    .catch(err => console.log(err));
    
};

module.exports = GenerateStats;