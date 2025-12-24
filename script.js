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

/* ================= MAIN ================= */
function processCSV(csvText) {
  const data = parseCSV(csvText);
  const headers = data[0].map(h => h.trim());
  const rows = data.slice(1);

  // 🔑 HEADER INDEX MAPPING (THIS IS THE FIX)
  const idx = name => headers.indexOf(name);

  const CAMPAIGN = idx("Campaign Name");
  const DATE     = idx("Date");
  const SPEND    = idx("Ad Spend");
  const VIEWS    = idx("Views");
  const CLICKS   = idx("Clicks");
  const UNITS    = idx("Total Converted Units");
  const REVENUE  = idx("Total Revenue (Rs.)");

  if ([CAMPAIGN, DATE, SPEND, VIEWS, CLICKS, UNITS, REVENUE].includes(-1)) {
    alert("CSV headers do not match required format.");
    return;
  }

  let totalSpend = 0, totalRevenue = 0, totalUnits = 0;
  let totalViews = 0, totalClicks = 0;

  const daily = {};
  const campaigns = {};

  rows.forEach(r => {
    const campaign = r[CAMPAIGN];
    const date = r[DATE];
    const spend = parseFloat(r[SPEND]) || 0;
    const views = parseInt(r[VIEWS]) || 0;
    const clicks = parseInt(r[CLICKS]) || 0;
    const units = parseInt(r[UNITS]) || 0;
    const revenue = parseFloat(r[REVENUE]) || 0;

    if (!campaign) return;

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
      campaigns[campaign] = { spend: 0, revenue: 0, units: 0 };
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
  const roi = spend > 0 ? revenue / spend : 0;
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
    const roi = c.spend > 0 ? c.revenue / c.spend : Infinity;

    let cls, flag;
    if (roi < 3) { cls = "red"; flag = "🔴 Loss / Critical"; }
    else if (roi <= 5) { cls = "orange"; flag = "🟠 Needs Optimization"; }
    else { cls = "green"; flag = "🟢 Scale Candidate"; }

    tbody.innerHTML += `
      <tr class="${cls}">
        <td>${name}</td>
        <td>${c.spend.toFixed(0)}</td>
        <td>${c.revenue.toFixed(0)}</td>
        <td>${c.units}</td>
        <td>${roi === Infinity ? "∞" : roi.toFixed(2)}</td>
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
  const roi = labels.map((d, i) => spend[i] ? revenue[i] / spend[i] : 0);

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
