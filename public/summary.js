var main;

document.onreadystatechange = () => {
  if (document.readyState === 'interactive') {
    main = document.querySelector('main');
    renderSummary();
  }
};

function renderTimestamp(data) {
  var timeStamp = document.querySelector('.last-updated');
  timeStamp.innerText = new Date(data).toLocaleString();
}

function renderSummary() {
  var summary = '';
  var total = '';
  var date, count;
  var reports, versions;
  var reportTitles = {};
  var report = 'untriaged';
  
  // clean up 
  main.innerHTML = '';
  
  fetch('/data')
  .then(response => {
    if(response.ok) {
      response.json()
      .then(body => {
        if (!body.stats) {
          main.insertAdjacentHTML('beforeend', `<p>Still fetching data, will automatically reload.</p>`);
          setTimeout(renderSummary, 60000);
        } else {
          renderTimestamp(body.lastUpdate);
          
          versions = Object.keys(body.stats.versions);
          reports  = Object.keys(body.stats.versions[versions[0]]);
          reports.forEach(name => {
            reportTitles[name] = body.stats.versions[versions[0]][name].title;
          });

          summary = `<h3>${reportTitles[report]}</h3>`;
          
          date = Object.keys(body.stats.bugCounts.dates).pop();
          count = body.stats.bugCounts.dates[date];
          summary += `<table>
                     <thead>
                       <tr>
                         <th>Version</th>
                         <th>&gt; M</th>
                         <th>≤ M</th>
                         <th>≤ W</th>
                         <th>All</th>
                       </tr>
                     </thead>`;
          
          summary += '<tbody>';
          
          versions.forEach(version => {
                summary += `<tr>
                  <td>${version}</td>
                  <td>${body.stats.versions[version][report].ages.gt_month || 0}</td>
                  <td>${body.stats.versions[version][report].ages.lte_month || 0}</td>
                  <td>${body.stats.versions[version][report].ages.lte_week || 0}</td>
                  <td>${body.stats.versions[version][report].count}</td>
                </tr>`;
          });
    
          summary += '</tbody>';
          
          summary += `<tbody>
            <tr>
              <td colspan="2">New Bugs</td>
              <td colspan="2">${date}</td>
              <td>${count}</td>
            </tr>
          </tbody>`;
          
          summary += '</table>';
          main.insertAdjacentHTML('beforeend', summary);
        }
      })
    }
  });
}