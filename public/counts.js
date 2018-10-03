var main;

document.onreadystatechange = () => {
  if (document.readyState === 'interactive') {
    main = document.querySelector('main');
    renderCounts();
  }
};

function renderTimestamp(data) {
  var timeStamp = document.querySelector('.last-updated');
  timeStamp.innerText = new Date(data).toLocaleString();
}

function renderCounts() {
  var all;

  // cleanup
  document.body.classList.add('single-report');

  main.innerHTML = '';
  document.querySelector('.report-name').textContent = 'New Bug Counts';

  fetch('/data')
  .then(response => {
    if(response.ok) {
      response.json()
      .then(body => {
        renderTimestamp(body.lastUpdate);
        main.insertAdjacentHTML('beforeend', getCountTable(body.stats.bugCounts, all));
      })
    }
  });
}

function makeCell(bin) {
  var cell = '0'; // default nothing
  if (bin && bin.count) {
    cell = `<a href="https://bugzilla.mozilla.org/buglist.cgi?bug_id=${bin.bugs.join(',')}">${bin.count}</a>`;
  }
  return cell;
}

function getTable(stats, version, report, all) {
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
                ${makeCell(rank.gt_month)}
              </td>
              <td>
                ${makeCell(rank.lte_month)}
              </td>
              <td>
                ${makeCell(rank.lte_week)}
              </td>
              <td>
                ${makeCell(rank.all)}
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
                  <li>All components: ${reportFields.count} bugs</li>
                  <li>Components with bugs: ${numComponents}</li>
                  <li>Avg. bugs/component with bugs: ${avg}</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Component</td>
              <td>&gt; M</td>
              <td>≤ M</td>
              <td>≤ W</td>
              <td>All</td>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table></div>`;
  
  return str;
}

function getCountTable(data, all) {
  var str = '', headers = '', tableBody ='', total = 0;
  
  // headers and total bug counts

  tableBody += `<tr class="total">
                  <td>Total</td>`;
  Object.keys(data.dates).forEach(date => { 
    var parsed = new Date(date);
    var count = data.dates[date] || 0;
    headers += `<th>${parsed.getUTCMonth() + 1}-${parsed.getUTCDate()}</th>`;
    tableBody += `<td>${count}</td>`;
    total += count;
  });
  tableBody += `\n<td>${total}</td>
                    </tr>`;

  // counts for each product
  Object.keys(data.products).forEach(product => {
    var total = 0, rows = [];
    tableBody += `<tr class="product">
                    <td>${product}</td>`;
    Object.keys(data.dates).forEach(date => {
      var count = data.products[product].dates[date] || 0;
      tableBody += `<td>${count}</td>`;
      total += count;
    });
    tableBody += `\n<td>${total}</td>
            </tr>`;

    // counts for each component
    Object.keys(data.products[product].components).forEach(component => {
      var total = 0;
      var row = `<tr class="component">
                  <td>${component}</td>`;
      Object.keys(data.dates).forEach(date => {
        var count = data.products[product].components[component].dates[date] || 0;
        row += `<td>${count}</td>`;
        total += count;
      });
      row += `\n<td>${total}</td>
              </tr>`;  
      rows.push({html: row, total: total});
    });

    // sort components by total decending
    rows.sort((a, b) => {
      return b.total - a.total;
    });

    // join rows for components in this product
    rows.forEach(row => tableBody += row.html);
  });
  
  str = `<div><table class="counts">
            <thead>
              <tr>
                <th>Component</th>
                ${headers}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                ${tableBody}
              </tr>
            </tbody>
          </table></div>`;

  return str;
}