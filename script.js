let trendChart;

document.getElementById("csvFile").addEventListener("change", e => {
  const reader = new FileReader();
  reader.onload = () => processCSV(reader.result);
  reader.readAsText(e.target.files[0]);
});

function processCSV(csv) {
  const lines = csv.trim().split("\n");
  const rows = lines.slice(1);

  let totalSpend = 0, totalRevenue = 0, totalUnits = 0;
  let totalViews = 0, totalClicks = 0;

  const daily = {};            // for trend chart
  const campaigns = {};        // 🔑 CONSOLIDATION OBJECT

  rows.forEach(r => {
    const c = r.split(",");

    const date = c[2];
    const campaign = c[1];
    const spend = +c[3] || 0;
    const views = +c[4] || 0;
    const clicks = +c[5] || 0;
    const units = +c[6] || 0;
    const revenue = +c[7] || 0;

    if (!campaign || spend === 0) return;

    /* ========= OVERALL TOTALS ========= */
    totalSpend += spend;
    totalRevenue += revenue;
    totalUnits += units;
    totalViews += views;
    totalClicks += clicks;

    /* ========= DAILY (TREND) ========= */
    if (!daily[date]) daily[date] = { spend: 0, revenue: 0 };
    daily[date].spend += spend;
    daily[date].revenue += revenue;

    /* ========= CAMPAIGN CONSOLIDATION ========= */
    if (!campaigns[campaign]) {
      campaigns[campaign] = {
        spend: 0,
        revenue: 0,
        units: 0,
        views: 0,
        clicks: 0
      };
    }

    campaigns[campaign].spend += spend;
    campaigns[campaign].revenue += revenue;
    campaigns[campaign].units += units;
    campaigns[campaign].views += views;
    campaigns[campaign].clicks += clicks;
  });

  renderKPIs(totalSpend, totalRevenue, totalUnits, totalClicks);
  renderFunnel(totalViews, totalClicks, totalUnits);
  renderCampaignTable(campaigns);
  renderTrend(daily);
}

/* ================= KPIs ================= */
function renderKPIs(spend, revenue, units, clicks) {
  const roi = revenue / spend;
  const roiClass = roi < 3 ? "red" : roi <= 5 ? "orange" : "green";

  document.getElementById("kpis").innerHTML = `
    <div class="kpi">Spend<br>₹${spend.toFixed(0)}</div>
    <div class="kpi">Revenue<br>₹${revenue.toFixed(0)}</div>
    <div class="kpi ${roiClass}">ROI<br>${roi.toFixed(2)}</div>
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

/* ================= CAMPAIGN TABLE (NO DUPLICATES) ================= */
function renderCampaignTable(campaigns) {
  const tbody = document.querySelector("#campaignTabl
