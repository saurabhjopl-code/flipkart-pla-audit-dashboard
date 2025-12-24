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
      row.push(current);
      current = "";
    } else if (char === "\n" && !inQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current);
  rows.push(row);
  return rows;
}

/* ================= HEADER NORMALIZATION ================= */
function normalize(h) {
  return h
    .toLowerCase()
    .replace(/\ufeff/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/* ================= MAIN ================= */
function processCSV(csvText) {
  const data = parseCSV(csvText);
  const rawHeaders = data[0];
  const headers = rawHeaders.map(h => normalize(h));
  const rows = data.slice(1);

  const IDX = {
    CAMPAIGN: headers.findIndex(h => h.includes("campaignname")),
    DATE: headers.findIndex(h => h === "date"),
    SPEND: headers.findIndex(h => h.includes("spend")),
    VIEWS: headers.findIndex(h => h.includes("view")),
    CLICKS: headers.findIndex(h => h.includes("click")),
    UNITS: headers.findIndex(h => h.includes("unit")),
    REVENUE: headers.findIndex(h => h.includes("revenue"))
  };

  let totalSpend = 0,
      totalRevenue = 0,
      totalUnits = 0,
      totalViews = 0,
      totalClicks = 0;

  const daily = {};
  const campaigns = {};

  rows.forEach(r => {
    const campaign = r[IDX.CAMPAIGN];
    if (!campaign) return;

    const date = r[IDX.DATE];
    const spend = parseFloat(r[IDX.SPEND]) || 0;
    const views = parseInt(r[IDX.VIEWS]) || 0;
    const clicks = parseInt(r[IDX.CLICKS]) || 0;
    const units = parseInt(r[IDX.UNITS]) || 0;
    const revenue = parseFloat(r[IDX.REVENUE]) || 0;

    /* TOTALS */
    totalSpend += spend;
    totalRevenue += revenue;
    totalUnits += units;
    totalViews += views;
    totalClicks += clicks;

    /* DAILY */
    if (!daily[date]) daily[date] = { spend: 0, revenue: 0 };
    daily[date].spend += spend;
    daily[date].revenue += revenue;

    /* CAMPAIGN CONSOLIDATION */
    if (!campaigns[campaign]) {
      campaigns[campaign] = { spend: 0, revenue: 0, units: 0 };
    }

    campaigns[campaign].spend += spend;
    campaigns[campaign].revenue += revenue;
    campaigns[campaign].units += units;
  });

  renderKPIs(totalSpend, totalRevenue, totalUnits, totalClicks);
  renderCampaignTable(campaigns);
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
