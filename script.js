let trendChart;

document.getElementById("csvFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => processCSV(reader.result);
  reader.readAsText(file);
});

/* ================= CSV PARSER ================= */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if (char === "\n" && !inQuotes) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  rows.push(row);

  return rows;
}

/* ================= MAIN PROCESS ================= */
function processCSV(csvText) {
  const data = parseCSV(csvText);
  const headers = data[0];
  const rows = data.slice(1);

  let totalSpend = 0, totalRevenue = 0, totalUnits = 0;
  let totalViews = 0, totalClicks = 0;

  const daily = {};
  const campaigns = {};

  rows.forEach(c => {
    const campaign = c[1];
    const date = c[2];
    const spend = parseFloat(c[3]) || 0;
    const views = parseInt(c[4]) || 0;
    const clicks = parseInt(c[5]) || 0;
    const units = parseInt(c[6]) || 0;
    const revenue = parseFloat(c[7]) || 0;

    if (!campaign || spend === 0) return;

    /* totals */
    totalSpend += spend;
    totalRevenue += revenue;
    totalUnits += units;
    totalViews += views;
    totalClicks += clicks;

    /* daily */
    if (!daily[date]) daily[date] = { spend: 0, revenue: 0 };
    daily[date].spend += spend;
    daily[date].revenue += revenue;

    /* campaign consolidation */
    if (!campaigns[campaign]) {
      campaigns[campaign] = {
        spend: 0,
        revenue: 0,
        units: 0
      };
    }

    campaigns[campaign].spend += spend;
    campaigns[campaign].revenue += revenue;
    campaigns[campaign].units += units;
  });

  renderKPIs(totalSpend, totalRevenue, totalUnits, totalClicks);
  renderFunnel(totalViews, totalClicks, totalUnits);
  renderCampaignTable(campaigns);
  renderTrend(daily);
}

/* ================= KPI ================= */
function renderKPIs(spend, revenue, units, clicks) {
  const roi = revenue / spend;
  const cls = roi < 3 ? "red" : roi <= 5 ? "orange" : "green";

  document.getElementById("kpis").innerHTML = `
    <div class="kpi">Spend<br>₹${spend.toFixed(0)}</div>
    <div class="kpi">Revenue<br>₹${revenue.toFixed(0)}</div>
    <div class="kpi ${cls}">ROI<br>${roi.toFixed(2)}</div>
    <div class="kpi">Clicks<br>${clicks}</div>
    <div class="kpi">Units<br>${units}</div>
  `;
}

/* ================= FUNNEL ================= */
function renderFunnel(views, clicks, units) {
  document.getElementById("views").innerText = views;
  document.getElementById("clicks").innerText = clicks;
  document.getElementById("units").innerText = units;

  document.getElementById("ctr").innerText =
    views ? ((clicks / views) * 100).toFixed(2) + "%" : "0%";

  document.getElementById("conversion").innerText =
    clicks ? ((units / clicks) * 100).toFixed(2) + "%" : "0%";
}

/* ================= TABLE ================= */
function renderCampaignTable(campaigns) {
  const tbody = document.querySelector("#campaignTable tbody");
  tbody.innerHTML = "";

  Object.keys(campaigns).forEach(name => {
    const c = campaigns[name];
    const roi = c.revenue / c.spend;

    let flag, cls;
    if (roi < 3) { flag = "🔴 Loss / Critical"; cls = "red"; }
    else if (roi <= 5) { flag = "🟠 Needs Optimization"; cls = "orange"; }
    else { flag = "🟢 Scale Candidate"; cls = "green"; }

    tbody.innerHTML += `
      <tr class="${cls}">
        <td>${name}</td>
        <td>${c.spend.toFixed(0)}</td>
        <td>${c.revenue.toFixed(0)}</td>
        <td>${c.units}</td>
        <td>${roi.toFixed(2)}</td>
        <td>${flag}</td>
      </tr>
    `;
  });
}

/* ================= TREND ================= */
function renderTrend(data) {
  const labels = Object.keys(data).sort();
  const spend = labels.map(d => data[d].spend);
  const revenue = labels.map(d => data[d].revenue);
  const roi = labels.map((d, i) => revenue[i] / spend[i]);

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Spend", data: spend },
        { label: "Revenue", data: revenue },
        { label: "ROI", data: roi, yAxisID: "y1" }
      ]
    },
    options: {
      scales: {
        y1: { position: "right", grid: { drawOnChartArea: false } }
      }
    }
  });
}
