var reportName, main, args;

document.onreadystatechange = () => {
  if (document.readyState === 'interactive') {
    main = document.querySelector('main');
    args = getArguments();
    renderStats(args);
  }
};

function getArguments() {
  
  var query = document.location.search;
  var args  = { versions: 'all', reports: 'all', all: false, counts: false } 
  
  query.slice(1).split('&').forEach(pair => {
    var kv = pair.split('=');
    if (kv.length === 2) {
      if (kv[0] === 'version') {
        args.versions = kv[1]; 
      }
      if (kv[0] === 'report') {
        args.reports = kv[1];
      }
    }
    if (kv[0] === 'all') {
      args.all = true; 
    } 
  });

  return args;
  
}  

function getArgument(name, args, data) {
  var response = [];
  var allKeys = Object.keys(data);
  
  if (args[name] === 'all') {
    response = allKeys;
  } else {
    args[name].split(',').forEach(value => {
      if (allKeys.indexOf(value) > -1) {
        response.push(value);
      }
    });
  }
  return response;
}

function renderTimestamp(data) {
  var timeStamp = document.querySelector('.last-updated');
  timeStamp.innerText = new Date(data).toLocaleString();
}

function renderStats(args) {
  var versions;
  var reportNames;
  var all = false;
  var reportTitles = {};
  
  if (args.all && args.all === true) {
    all = true;
  }

  // clean up 
  main.innerHTML = '';
  
  fetch('/data')
  .then(response => {
    if(response.ok) {
      response.json()
      .then(body => {
        if (!body.stats) {
          main.insertAdjacentHTML('beforeend', `<p>Still fetching data, will automatically reload.</p>`);
        } else {
          versions = getArgument('versions', args, body.stats.versions);
          reportNames = getArgument('reports', args, body.stats.versions[versions[0]]);
          
          renderTimestamp(body.lastUpdate);

          // hack to fix page grid when we display one report
          if (reportNames.length === 1) {
            document.body.classList.add('single-report');
          }

          reportNames.forEach(name => {
            reportTitles[name] = body.stats.versions[versions[0]][name].title;
          });
          reportNames.forEach(name => {
            var reportTitle = reportTitles[name];
            
            if (reportNames.length === 1) {
              document.querySelector('.report-name').textContent = reportTitles[name];
            } else {
              main.insertAdjacentHTML('beforeend', `<h3>${reportTitle}</h3>`);
            }

            versions.forEach(version => {
              main.insertAdjacentHTML('beforeend', 
                                    getTable(reportTitle, body.stats.versions[version],
                                             version, name, all));
            });
          });
        }
      });
    }
  });
}

function makeCell(reportTitle, bins, binName, component) {
  var cell = '0'; // default nothing
  var title; 
  var bin = {count: 0, bugs: []};
  
  bins.forEach(tranche => {
    if (tranche && tranche.count) {
      bin.count += tranche.count;
      tranche.bugs.forEach(bug => {
        bin.bugs.push(bug);
      });
    }
  });
  
  if (bin && bin.count && bin.count > 0) {
    title = encodeURIComponent(reportTitle + ' bugs in ' + component + ' ' + binName);
    cell = `<a href="https://bugzilla.mozilla.org/buglist.cgi?bug_id=${bin.bugs.sort().join(',')}&amp;title=${title}" target="_blank">${bin.count}</a>`;
  }
  return cell;
}

function getTable(reportTitle, stats, version, report, all) {
  var str = '', rows = '';
  // refer to report data fields 
  var reportFields = stats[report];
  var numComponents = reportFields.ranks.length;
  var avg = (numComponents > 0) ? Math.floor(reportFields.count/numComponents) : 0;
  // if we don't show all, show top ten
  var reportData = all ? reportFields.ranks : reportFields.ranks.slice(0, 10);
  
  reportData.forEach(rank => {
    rows += `<tr>
              <td>${rank.component}</td>
              <td>
                ${makeCell(reportTitle, [rank.gt_month],
                           'older than a month', rank.component)}
              </td>
              <td>
                ${makeCell(reportTitle, [rank.lte_month, rank.gt_month],
                           'older than a week', rank.component)}
              </td>
              <td>
                ${makeCell(reportTitle, [rank.lte_week],
                           'less than a week old', rank.component)}
              </td>
              <td>
                ${makeCell(reportTitle, [rank.all],
                           'total', rank.component)}
              </td>
            </tr>`;
  });
  
  str = `<div><table>
          <thead>
            <tr>
              <th colspan="5">Firefox <span class="versionNumber">${version}</span></th>
            </tr>
            <tr>
              <td colspan="5">
                <ul>
                  <li>&gt; M: ${reportFields.ages.gt_month || 0}</li>
                  <li>&gt; W: ${reportFields.ages.lte_month + reportFields.ages.gt_month || 0}</li>
                  <li>≤ W: ${reportFields.ages.lte_week || 0}</li>
                  <li>All: ${reportFields.count || 0}</li>
                </ul>
                </ul>
                  <li>Components with bugs: ${numComponents}</li>
                  <li>Avg. bugs/component with bugs: ${avg}</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Component</td>
              <td title="NB: This column is counted in the &gt; W column total." style="color: #bb3016;">&gt; M</td>
              <td title="Bugs older than a week (includes bugs from previous column)">&gt; W</td>
              <td title="Bugs a week or less old">≤ W</td>
              <td title="All untrigaged bugs">All</td>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table></div>`;
  
  return str;
}