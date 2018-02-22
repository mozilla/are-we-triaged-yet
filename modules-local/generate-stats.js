'use strict';

const fetch = require('node-fetch');

var GenerateStats = function(versions) {

    var stats = {versions: {}};
    var requests = [];

    /* 
    Count bugs filed in last week
    */

    requests.push(fetch('https://bugzilla.mozilla.org/rest/bug?include_fields=id,creation_time,status,resolution,component,product&chfield=[Bug%20creation]&chfieldfrom=-3d&chfieldto=Now&email1=intermittent-bug-filer%40mozilla.bugs&emailreporter1=1&emailtype1=notequals&f1=component&f3=bug_severity&f4=short_desc&f5=component&f6=component&f7=component&limit=0&o1=notequals&o3=notequals&o4=notsubstring&o5=notequals&o6=notsubstring&o7=notequals&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSS&product=Toolkit&short_desc=^\\[meta&short_desc_type=notregexp&v1=Graphics%3A%20WebRender&v3=enhancement&v4=[meta]&v5=Build%20Config&v6=CA%20Certificat')
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
          {name: 'untriaged', title: 'Pending untriaged', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,creation_time,status,resolution,product,component&chfield=[Bug%20creation]&chfieldfrom=${mergedate}&chfieldto=Now&email1=intermittent-bug-filer%40mozilla.bugs&emailreporter1=1&emailtype1=notequals&f1=component&f2=cf_status_${versionStr}&f3=bug_severity&f4=short_desc&f5=component&f6=component&limit=0&o1=notequals&o2=anywords&o3=notequals&o4=notsubstring&o5=notequals&o6=notsubstring&priority=--&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSS&product=Toolkit&resolution=---&short_desc=^\\[meta&short_desc_type=notregexp&v1=Graphics%3A%20WebRender&v2=%3F%2C---&v3=enhancement&v4=[meta]&v5=Build%20Config&v6=CA%20Certificat`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?chfield=%5BBug%20creation%5D&chfieldfrom=${mergedate}&chfieldto=Now&email1=intermittent-bug-filer%40mozilla.bugs&emailreporter1=1&emailtype1=notequals&f2=cf_status_${versionStr}&f3=bug_severity&f4=short_desc&f5=component&f6=component&o1=notsubstring&o2=anywords&o3=notequals&o4=notsubstring&o5=notequals&o6=notsubstring&o7=notsubstring&priority=--&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSS&product=Toolkit&query_format=advanced&resolution=---&short_desc=%5E%5C%5Bmeta&short_desc_type=notregexp&v2=%3F%2C---&v3=enhancement&v4=%5Bmeta%5D&v5=Build%20Config&v6=CA%20Certificat&order=bug_id&limit=0`},
          {name: 'affecting', title:'P1 affecting or may affect', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&f1=bug_severity&f10=CP&f11=component&f12=component&f2=short_desc&f3=OP&f4=cf_status_${versionStr}&f5=OP&f6=cf_status_firefox58&f7=creation_ts&f8=CP&j3=OR&j5=OR&limit=0&o1=notequals&o11=notequals&o12=notsubstring&o2=notregexp&o4=equals&o6=anywords&o7=greaterthaneq&priority=P1&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSPR&product=NSS&product=Toolkit&resolution=---&v1=enhancement&v11=Build%20Config&v12=CA%20Certifcat&v2=%5E%5C%5Bmeta&v4=affected&v6=---%2C%3F&v7=${mergedate}`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?f1=bug_severity&f10=CP&f11=component&f12=component&f2=short_desc&f3=OP&f4=cf_status_${versionStr}&f5=OP&f6=cf_status_${versionStr}&f7=creation_ts&f8=CP&j3=OR&j5=OR&o1=notequals&o11=notequals&o12=notsubstring&o2=notregexp&o4=equals&o6=anywords&o7=greaterthaneq&priority=P1&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSPR&product=NSS&product=Toolkit&query_format=advanced&resolution=---&v1=enhancement&v11=Build%20Config&v12=CA%20Certifcat&v2=%5E%5C%5Bmeta&v4=affected&v6=---%2C%3F&v7=${mergedate}&order=bug_id&limit=0`},
          {name: 'to_uplift', title: 'Uplift requested', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&chfield=resolution&chfieldfrom=${betadate}&chfieldto=Now&chfieldvalue=FIXED&f2=flagtypes.name&f3=component&f4=component&f5=attachments.ispatch&f6=cf_status_${versionStr}&o2=equals&o3=notequals&o4=notsubstring&o6=equals&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSS&product=Toolkit&v2=approval-mozilla-beta%3F&v3=Build%20Config&v4=CA%20Certificat&v6=fixed`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?priority=--&resolution=FIXED&o2=equals&chfieldto=Now&chfield=%5BBug%20creation%5D&query_format=advanced&chfieldfrom=${betadate}&f2=flagtypes.name&v2=approval-mozilla-beta%3F&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSS&product=Toolkit`}, 
          {name: 'uplifted', title: 'Uplifted', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&chfield=resolution&chfieldfrom=${betadate}&chfieldto=Now&chfieldvalue=FIXED&f2=flagtypes.name&f3=component&f4=component&f5=attachments.ispatch&f6=cf_status_${versionStr}&o2=equals&o3=notequals&o4=notsubstring&o6=equals&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSS&product=Toolkit&v2=approval-mozilla-beta%2B&v3=Build%20Config&v4=CA%20Certificat&v6=fixed`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?include_fields=id%2Csummary%2Cstatus%2Cproduct%2Ccomponent&chfield=resolution&chfieldfrom=${betadate}&chfieldto=Now&chfieldvalue=FIXED&f2=flagtypes.name&f3=component&f4=component&f5=attachments.ispatch&f6=cf_status_${versionStr}&o2=equals&o3=notequals&o4=notsubstring&o6=equals&product=Core&product=External%20Software%20Affecting%20Firefox&product=Firefox&product=NSS&product=Toolkit&v2=approval-mozilla-beta%2B&v3=Build%20Config&v4=CA%20Certificat&v6=fixed`}, 
          {name: 'fix_or_defer', title: 'Fix or defer', url: `https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status,product,component&action=wrap&cf_status_${versionStr}=affected&f1=component&o1=notequals&priority=P1&product=Core&product=Firefox&product=NSPR&product=NSS&product=Toolkit&resolution=---&v1=Build%20Config`, buglist: `https://bugzilla.mozilla.org/buglist.cgi?cf_status_${versionStr}=affected&f1=component&o1=notequals&priority=P1&product=Core&product=Firefox&product=NSPR&product=NSS&product=Toolkit&resolution=---&v1=Build%20Config`}
        ];
 
        stats.versions[version.number] = {};

        queries.forEach(query => {
            console.log(query.url);
            requests.push(fetch(query.url)
                .then(response => {
                    if (response.ok)
                    response.json()
                    .then(data => {
                        stats.versions[version.number][query.name] = {
                            title: query.title,
                            buglist: query.buglist,
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
    }).
    catch(err => console.log(err));
    
}

module.exports = GenerateStats