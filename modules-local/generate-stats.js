'use strict';

const fetch = require('node-fetch');
const isArray = require('util').isArray;

var GenerateStats = function(config) {

    var stats = {versions: {}};
    var requests = [];
    var versions, productList = '', exclusionList = 'none';

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

    if (config.exclude && isArray(config.exclude)) {
        exclusionList = encodeURIComponent(config.exclude.reduce((list,component) => {
            return list + ',' + component;
        }, ''));
    }

    /* 
    Count bugs filed in last week
    */

    requests.push(fetch(`https://bugzilla.mozilla.org/rest/bug?include_fields=id,creation_time,status,resolution,component,product&chfield=%5BBug%20creation%5D&chfieldfrom=-1w&chfieldto=Now&email1=intermittent-bug-filer%40mozilla.bugs&emailreporter1=1&emailtype1=notequals&f1=component&f2=bug_severity&keywords=meta&keywords_type=nowords&limit=0&o1=nowordssubstr&o2=notequals${productList}&short_desc=%5E%5C%5Bmeta%5C%5D&short_desc_type=notregexp&v1=${exclusionList}&v2=enhancement`)
        .then(response => {
            if (response.ok) {
                response.json()
                .then(data => {
                    processData(data);
                })
            }
        })
        .catch(err => {
            console.error(err);
        })
    );

    function processData(data) {
        var dateString;
        var dateFiled;
        var counts = {};
        var list = [];
        
        data.bugs.forEach(bug => {
            // count dates
            dateFiled = new Date(bug.creation_time);
            dateString = [dateFiled.getUTCFullYear(), dateFiled.getUTCMonth()+1, dateFiled.getUTCDate()]
            .join('-');
            if (counts[dateString]) {
                counts[dateString]++;
            } else {
                counts[dateString] = 1;
            }
        });
        
        // sort by dates
        
        Object.keys(counts).forEach(date => {
            list.push({date: date, count: counts[date]});
        });
        
        list.sort((a, b) => {
            return (a.date - b.date);
        });
        
        stats.newBugs = list;
    }

    /*
    Count categories
    */

    versions.forEach(version => {

        var mergedate  = version.mergedate;
        var betadate   = version.betadate;
        var versionStr = 'firefox' + version.number;
        var queries    = [
          {name: 'untriaged', title: 'Pending untriaged', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&chfield=%5BBug%20creation%5D&chfieldfrom=${mergedate}&chfieldto=Now&f2=cf_status_${versionStr}&f3=bug_severity&f4=short_desc&f5=component&limit=0&o2=anywords&o3=notequals&o4=notsubstring&o5=nowordssubstr&priority=--${productList}&resolution=---&short_desc=%5E%5C%5Bmeta&short_desc_type=notregexp&v2=%3F%2C---&v3=enhancement&v4=%5Bmeta%5D&v5=${exclusionList}`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?chfield=%5BBug%20creation%5D&chfieldfrom=${mergedate}&chfieldto=Now&f2=cf_status_${versionStr}&f3=bug_severity&f4=short_desc&f5=component&o2=anywords&o3=notequals&o4=notsubstring&o5=nowordssubstr&priority=--&resolution=---&short_desc=%5E%5C%5Bmeta&short_desc_type=notregexp&v2=%3F%2C---&v3=enhancement&v4=%5Bmeta%5D&v5=${exclusionList}&order=bug_id&limit=0`},
          {name: 'affecting', title:'P1 affecting or may affect', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&f1=bug_severity&f10=CP&f11=component&f2=short_desc&f3=OP&f4=cf_status_${versionStr}&f5=OP&f6=cf_status_${versionStr}&f7=creation_ts&f8=CP&j3=OR&j5=OR&limit=0&o1=notequals&o11=nowordssubstr&o2=notregexp&o4=equals&o6=anywords&o7=greaterthaneq&priority=P1&${productList}&resolution=---&v1=enhancement&v11=${exclusionList}&v2=%5E%5C%5Bmeta&v4=affected&v6=---%2C%3F&v7=${mergedate}`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?f1=bug_severity&f10=CP&f11=component&f2=short_desc&f3=OP&f4=cf_status_${versionStr}&f5=OP&f6=cf_status_${versionStr}&f7=creation_ts&f8=CP&j3=OR&j5=OR&o1=notequals&o11=nowordssubstr&o2=notregexp&o4=equals&o6=anywords&o7=greaterthaneq&priority=P1&resolution=---&v1=enhancement&v11=${exclusionList}&v2=%5E%5C%5Bmeta&v4=affected&v6=---%2C%3F&v7=${mergedate}&order=bug_id&limit=0`},
          {name: 'uplifted', title: 'Uplifted', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&chfield=resolution&chfieldfrom=${betadate}&chfieldto=Now&chfieldvalue=FIXED&f2=flagtypes.name&f3=component&f4=cf_status_${versionStr}&f5=attachments.ispatch&n3=1&o2=equals&o3=anywordssubstr&o4=equals${productList}&v2=approval-mozilla-beta%2B&v3=${exclusionList}&v4=fixed`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?v4=fixed&o3=anywordssubstr&v3=${exclusionList}&o2=equals&f4=cf_status_${versionStr}&chfieldto=Now&query_format=advanced&chfield=resolution&chfieldfrom=${betadate}&f3=component&o4=equals&f2=flagtypes.name&chfieldvalue=FIXED&f5=attachments.ispatch&v2=approval-mozilla-beta%2B&n3=1`}, 
          {name: 'fix_or_defer', title: 'Fix or defer', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&f1=component&f2=cf_status_${versionStr}&n1=1&o1=anywordssubstr&o2=equals&priority=P1${productList}&resolution=---&v1=${exclusionList}&v2=affected`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?priority=P1&f1=component&o1=anywordssubstr&resolution=---&o2=equals&n1=1&query_format=advanced&f2=cf_status_${versionStr}&v1=${exclusionList}&v2=affected`}
        ];
 
        stats.versions[version.number] = {};

        queries.forEach(query => {
            requests.push(fetch(query.url)
                .then(response => {
                    if (response.ok)
                    response.json()
                    .then(data => {
                        stats.versions[version.number][query.name] = {
                            title: query.title,
                            buglist: query.buglist,
                            buglistAll: query.buglist + productList,
                            count: data.bugs.length,
                            ranks: rankComponents(data.bugs)
                        };
                    })
                })
                .catch(err => {
                    console.error(err + ', ' + query.name);
                })
            );
        });
    });

    function rankComponents(bugs) {
        var buckets = {};
        var ranks = [];
        bugs.forEach(bug => {
            // count components
            var component = bug.product + "::" + bug.component;
            if (buckets[component]) {
                buckets[component]++;
            } else {
                buckets[component] = 1;
            }
        });
        
        // sort by components
        
        Object.keys(buckets).forEach(component => {
            var componentName = component.split('\:\:');
            ranks.push({
                productName: componentName[0], componentName: componentName[1],
                component: component, count: buckets[component]
            });
        });
        
        ranks.sort((a,b) => {
            return(b.count - a.count);
        });
        
        return ranks;
    } 
    
    return Promise.all(requests).then(() => {
        return stats;
    })
    .catch(err => console.log(err));
    
}

module.exports = GenerateStats