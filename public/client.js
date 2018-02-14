var reportName, main
var args;

document.onreadystatechange = () => {
  if (document.readyState === 'interactive') {
    main = document.querySelector('main');
    args = getArguments();
    renderStats(args);
    window.setInterval(renderStats, 60*1000, args);
  }
};

function getArguments() {
  
  var query = document.location.search;
  var args  = { versions: 'all', reports: 'all', all: false } 
  
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

function renderStats(args) {
  var versions;
  var reportNames;
  var all = false;
  var reportTitles = {};
  
  if (args.all && args.all === true) {
    all = true;
  }
  
  fetch('/data')
  .then(response => {
    if(response.ok) {
      response.json()
      .then(body => {
        // clean up 
        main.innerHTML = '';
        if (!body.stats) {
          main.insertAdjacentHTML('beforeend', `<p>Still fetching data, will automatically reload.</p>`);
        } else {
          versions = getArgument('versions', args, body.stats.versions);
          reportNames = getArgument('reports', args, body.stats.versions[versions[0]]);

          // hack to fix page grid when we display one report
          if (reportNames.length === 1) {
            document.body.classList.add('single-report');
          }

          reportNames.forEach(name => {
            reportTitles[name] = body.stats.versions[versions[0]][name].title;
          });
          reportNames.forEach(name => {

            //TODO: fix this hack 
            if (reportNames.length === 1) {
              document.querySelector('.report-name').textContent = reportTitles[name];
            } else {
              main.insertAdjacentHTML('beforeend', `<h3>${reportTitles[name]}</h3>`);
            }

            versions.forEach(version => {
              main.insertAdjacentHTML('beforeend', 
                                    getTable(body.stats.versions[version], version, name, all));
            });
          });
        }
      });
    }
  });
}
  
function getTable(stats, version, report, all) {
  var str = '', rows = '';
  var numComponents = stats[report].ranks.length;
  var avg = (numComponents > 0) ? Math.floor(stats[report].count/numComponents) : 0;
  
  // if we don't show all, show top ten
  var reportData = all ? stats[report].ranks : stats[report].ranks.slice(0, 10);
  
  reportData.forEach(rank => {
    rows += `<tr>
              <td>${rank.component}</td>
              <td>${rank.count}</td>
            </tr>`;
  });
  
  str = `<div><table>
          <thead>
            <tr>
              <th colspan="2">Firefox <span class="versionNumber">${version}</span></th>
            </tr>
            <tr>
              <td colspan="2">
                <ul>
                  <li>All components: ${stats[report].count} bugs</li>
                  <li>Components with bugs: ${numComponents}</li>
                  <li>Avg. bugs/component with bugs: ${avg}</li>
                </ul>
              </td>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table></div>`;
  
  return str;
}