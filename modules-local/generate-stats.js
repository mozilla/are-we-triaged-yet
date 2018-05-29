'use strict';

const fetch = require('node-fetch');
const isArray = require('util').isArray;

// Generate custom searches URL in a much more readable way.
function custom_search(strings, ...computed) {
    // state of the synthesizer state machines.
    const s_new_line = "new_line";
    const s_new_expr = "new_expr";
    const s_operator = "operator";
    const s_value = "value";
    // Convert accumulated state into url fields.
    function line(q) {
        var num = q.num;
        if (q.fn) {
            q.url[q.fn] = q.v;
        } else if (q.up) {
            q.urlPrefix += q.v;
        } else if (q.ua) {
            q.urlSuffix += q.v;
        } else if (q.n || q.f || q.o || q.v || q.j) {
            q.num += 1;
            if (q.n) q.url["n" + num] = q.n;
            if (q.f) q.url["f" + num] = q.f;
            if (q.o) q.url["o" + num] = q.o;
            if (q.v) q.url["v" + num] = q.v;
            if (q.j) q.url["j" + num] = q.j;
        }
        return { num: q.num, urlPrefix: q.urlPrefix, urlSuffix: q.urlSuffix, url: q.url, state: s_new_line };
    }
    // Synthesized the url based on read token. Move the state of the state
    // machine based on read tokens.
    var synth = {
        '!': query => ({ ...query, n: "1", state: s_new_expr }),
        'ALL(': query => line({ ...query, f: "OP"}),
        'ANY(': query => line({ ...query, f: "OP", j: "OR" }),
        ')': query => line({ ...query, f: "CP"}),
        // Operators
        '==': query => ({ ...query, o: "equals", state: s_value }),
        '!=': query => ({ ...query, o: "notequals", state: s_value }),
        '<=': query => ({ ...query, o: "lessthaneq", state: s_value }),
        '>=': query => ({ ...query, o: "greaterthaneq", state: s_value }),
        'any-words': query => ({ ...query, o: "anywords", state: s_value }),
        'any-words-substr': query => ({ ...query, o: "anywordssubstr", state: s_value }),
        'no-words-substr': query => ({ ...query, o: "nowordssubstr", state: s_value }),
        'not-regexp': query => ({ ...query, o: "notregexp", state: s_value }),
        'not-substring': query => ({ ...query, o: "notsubstring", state: s_value }),
        'is-empty': query => line({ ...query, o: "isempty", state: s_new_line }),
        // Special fields
        'include_fields': (query, input) => ({ ...query, fn: input, state: s_value }),
        'changed_field': query => ({ ...query, fn: "chfield", state: s_value }),
        'changed_field_from': query => ({ ...query, fn: "chfieldfrom", state: s_value }),
        'changed_field_to': query => ({ ...query, fn: "chfieldto", state: s_value }),
        'changed_field_value': query => ({ ...query, fn: "chfieldvalue", state: s_value }),
        'limit': (query, input) => ({ ...query, fn: input, state: s_value }),
        'short_desc_field': query => ({ ...query, fn: "short_desc", state: s_value }),
        'short_desc_type': (query, input) => ({ ...query, fn: input, state: s_value }),
        'resolution': (query, input) => ({ ...query, fn: input, state: s_value }),
        'priority': (query, input) => ({ ...query, fn: input, state: s_value }),
        'order': (query, input) => ({ ...query, fn: input, state: s_value }),
        'query_format': (query, input) => ({ ...query, fn: input, state: s_value }),
        'email1': (query, input) => ({ ...query, fn: input, state: s_value }),
        'emailreporter1': (query, input) => ({ ...query, fn: input, state: s_value }),
        'emailtype1': (query, input) => ({ ...query, fn: input, state: s_value }),
        'keywords': (query, input) => ({ ...query, fn: input, state: s_value }),
        'keywords_type': (query, input) => ({ ...query, fn: input, state: s_value }),
        // Custom commands to use a single mechanism
        'bugzilla_url': query => ({ ...query, up: true, state: s_value }),
        'bugzilla_url_append': query => ({ ...query, ua: true, state: s_value }),
        // special custom search fields
        'attachments.ispatch': (query, input) => line({ ...query, f: input }),
        // Non-matched tokens
        __not_found__: (query, input) => {
            switch (query.state) {
            case s_new_expr:
            case s_new_line: return { ...query, f: input, state: s_operator };
            case s_value: return line({ ...query, v: input });
            }
            throw new Error(`custom_search parser: unexpected input: ${input} with state ${query.state} in
${strings.join(" ")}
            `);
        }
    };
    // Simple iterator which iterates over all tokens, separated by spaces.
    var string_separator = /\s+/;
    function* tokens() {
        var is = strings[Symbol.iterator]();
        var ic = computed[Symbol.iterator]();
        var vc = ic.next();
        while (!vc.done) {
            var vs = is.next();
            vs = vs.value.trim();
            if (vs)
                yield* vs.split(string_separator);
            yield vc.value;
            vc = ic.next();
        }
        yield* is.next().value.trim().split(string_separator);
    }
    // Iterate over the list of tokens (space separated strings) and
    // accumulate url fields.
    var query = { num: 1, urlPrefix: "", urlSuffix: "", url: {}, state: s_new_line };
    for (let tok of tokens()) {
        if (tok in synth)
            query = synth[tok](query, tok);
        else
            query = synth.__not_found__(query, tok);
    }
    // Convert url fields into a string which can be appended to a bugzilla
    // search query.
    var url = "";
    for (let k in query.url) {
        if (url)
            url += `&${k}=${query.url[k]}`;
        else
            url = `?${k}=${query.url[k]}`;
    }
    url = query.urlPrefix + url + query.urlSuffix;
    // If one of the category is not being displayed, try the url printed by this command.
    // console.log(url);
    return url;
}

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

    requests.push(fetch(custom_search`
      bugzilla_url https://bugzilla.mozilla.org/rest/bug
      bugzilla_url_append ${productList}
        include_fields id,creation_time,status,resolution,component,product
        limit 0
        keywords meta
        keywords_type nowords
        short_desc_field %5E%5C%5Bmeta%5C%5D short_desc_type notregexp
        changed_field %5BBug%20creation%5D
          changed_field_from -2w changed_field_to Now

        email1 intermittent-bug-filer%40mozilla.bugs
        emailreporter1 1
        emailtype1 notequals

        component no-words-substr ${exclusionList}
        bug_severity != enhancement
    `)
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
                    counts.products[bug.product].dates[dateString] ++
                } else {
                    counts.products[bug.product].dates[dateString] = 1
                }
            } else {
                counts.products[bug.product] = {};
                counts.products[bug.product].dates = {};
                counts.products[bug.product].components = {}
                counts.products[bug.product].dates[dateString] = 1;
            }

            // component counts
            if (counts.products[bug.product].components[bug.component]) {
                if (counts.products[bug.product].components[bug.component].dates[dateString]) {
                    counts.products[bug.product].components[bug.component].dates[dateString] ++
                } else {
                    counts.products[bug.product].components[bug.component].dates[dateString] = 1
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


    versions.forEach(version => {

        var mergedate  = version.mergedate;
        var betadate   = version.betadate;
        var versionStr = 'firefox' + version.number;
        var queries    = [
            {name: 'untriaged', title: 'Pending untriaged',
             url: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/rest/bug
               bugzilla_url_append ${productList}
                 limit 0
                 include_fields id,summary,status,product,component
                 changed_field %5BBug%20creation%5D
                   changed_field_from ${mergedate} changed_field_to Now
                 resolution ---
                 priority --
                 short_desc_field %5E%5C%5Bmeta short_desc_type notregexp

                 ${"cf_status_" + versionStr} any-words %3F%2C---
                 bug_severity != enhancement
                 short_desc not-substring %5Bmeta%5D
                 component no-words-substr ${exclusionList}
             `,
             buglist: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/buglist.cgi
               bugzilla_url_append ${productList}
                 limit 0
                 changed_field %5BBug%20creation%5D
                   changed_field_from ${mergedate} changed_field_to Now
                 resolution ---
                 priority --
                 short_desc_field %5E%5C%5Bmeta short_desc_type notregexp
                 order bug_id

                 ${"cf_status_" + versionStr} any-words %3F%2C---
                 bug_severity != enhancement
                 short_desc not-substring %5Bmeta%5D
                 component no-words-substr ${exclusionList}
             `
             },

            {name: 'affecting', title:'P1 affecting or may affect',
             url: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/rest/bug
               bugzilla_url_append ${productList}
                 limit 0
                 include_fields id,summary,status,product,component
                 resolution ---
                 priority P1
                 short_desc_field %5E%5C%5Bmeta short_desc_type notregexp

                 bug_severity != enhancement
                 short_desc not-regexp %5E%5C%5Bmeta
                 ANY(
                   ${"cf_status_" + versionStr} == affected
                   ALL(
                     ${"cf_status_" + versionStr} is-empty
                     creation_ts <= ${betadate}
                   )
                 )
                 component no-words-substr ${exclusionList}
             `,
             buglist: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/buglist.cgi
               bugzilla_url_append ${productList}
                 limit 0
                 resolution ---
                 priority P1
                 short_desc_field %5E%5C%5Bmeta short_desc_type notregexp
                 order bug_id

                 bug_severity != enhancement
                 short_desc not-regexp %5E%5C%5Bmeta
                 ANY(
                   ${"cf_status_" + versionStr} == affected
                   ALL(
                     ${"cf_status_" + versionStr} is-empty
                     creation_ts <= ${betadate}
                   )
                 )
                 component no-words-substr ${exclusionList}
            `
            },

            {name: 'uplifted', title: 'Uplifted',
             url: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/rest/bug
                 include_fields id,summary,status,product,component
                 changed_field ${"cf_status_" + versionStr} changed_field_value fixed
                   changed_field_from ${betadate} changed_field_to Now

                 flagtypes.name == approval-mozilla-beta%2B
                 attachments.ispatch
             `,
             buglist: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/buglist.cgi
                 query_format advanced
                 changed_field ${"cf_status_" + versionStr} changed_field_value fixed
                   changed_field_from ${betadate} changed_field_to Now

                 flagtypes.name == approval-mozilla-beta%2B
                 attachments.ispatch
             `,
             showAll: true},

            {name: 'fix_or_defer', title: 'Fix or defer',
             url: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/rest/bug
               bugzilla_url_append ${productList}
                 include_fields id,summary,status,product,component
                 resolution ---
                 priority P1

                 ! component any-words-substr ${exclusionList}
                 ${"cf_status_" + versionStr} == affected
             `,
             buglist: custom_search`
               bugzilla_url https://bugzilla.mozilla.org/buglist.cgi
                 query_format advanced
                 resolution ---
                 priority P1

                 ! component any-words-substr ${exclusionList}
                 ${"cf_status_" + versionStr} == affected
             `
            }
        ];
 
        stats.versions[version.number] = {};

        queries.forEach(query => {
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
                        stats.versions[version.number][query.name] = {
                            title: query.title,
                            buglist: query.buglist,
                            buglistAll: buglistAll,
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
