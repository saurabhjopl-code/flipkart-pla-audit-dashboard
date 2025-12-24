document.getElementById("fileInput").addEventListener("change", handleFiles);

/* ================= TAB SWITCH ================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* ================= FILE HANDLER ================= */
function handleFiles(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => processFile(reader.result);
    reader.readAsText(file);
  });
}

/* ================= ROBUST CSV PARSER ================= */
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

/* ================= FILE ROUTER ================= */
function processFile(csvText) {
  const data = parseCSV(csvText);
  const headers = data[0].map(h => h.toLowerCase().trim());

  // STRICT HEADER DETECTION (NO GUESSING)
  if (headers.includes("placement")) {
    processPlacement(data);
  } else if (headers.includes("campaign name") && headers.includes("ad spend")) {
    processCampaign(data);
  }
}

/* ================= CAMPAIGN PERFORMANCE ================= */
function processCampaign(data) {
  const headers = data[0];
  const rows = data.slice(1);

  const idx = h => headers.indexOf(h);

  const CAMPAIGN = idx("Campaign Name");
  const SPEND = idx("Ad Spend");
  const UNITS = idx("Total Converted Units");
  const REVENUE = idx("Total Revenue (Rs.)");

  let totalSpend = 0, totalRevenue = 0, totalUnits = 0;
  const campaigns = {};

  rows.forEach(r => {
    const name = r[CAMPAIGN];
    if (!name) return;

    const spend = +r[SPEND] || 0;
    const units = +r[UNITS] || 0;
    const revenue = +r[REVENUE] || 0;

    totalSpend += spend;
    totalRevenue += revenue;
    totalUnits += units;

    if (!campaigns[name]) campaigns[name] = { spend: 0, revenue: 0, units: 0 };
    campaigns[name].spend += spend;
    campaigns[name].revenue += revenue;
    campaigns[name].units += units;
  });

  document.getElementById("campaignKpi").innerHTML = `
    <div class="kpi">Spend<br>₹${totalSpend.toFixed(0)}</div>
    <div class="kpi">Revenue<br>₹${totalRevenue.toFixed(0)}</div>
    <div class="kpi">ROI<br>${totalSpend ? (totalRevenue / totalSpend).toFixed(2) : "∞"}</div>
    <div class="kpi">Units<br>${totalUnits}</div>
  `;

  const tbody = document.querySelector("#campaignTable tbody");
  tbody.innerHTML = "";

  Object.entries(campaigns)
    .sort((a, b) => b[1].spend - a[1].spend)
    .forEach(([name, c]) => {
      const roi = c.spend ? (c.revenue / c.spend).toFixed(2) : "∞";
      tbody.innerHTML += `
        <tr>
          <td>${name}</td>
          <td>${c.spend.toFixed(0)}</td>
          <td>${c.revenue.toFixed(0)}</td>
          <td>${c.units}</td>
          <td>${roi}</td>
          <td></td>
        </tr>
      `;
    });
}

/* ================= PLACEMENT PERFORMANCE ================= */
function processPlacement(data) {
  const headers = data[0];
  const rows = data.slice(1);

  const idx = h => headers.indexOf(h);

  const CAMPAIGN = idx("Campaign Name");
  const PLACEMENT = idx("Placement");
  const SPEND = idx("Spend");
  const UNITS = idx("Units");
  const REVENUE = idx("Revenue");

  const tbody = document.querySelector("#placementTable tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    if (!r[PLACEMENT]) return;

    const spend = +r[SPEND] || 0;
    const revenue = +r[REVENUE] || 0;
    const roi = spend ? (revenue / spend).toFixed(2) : "∞";

    tbody.innerHTML += `
      <tr>
        <td>${r[CAMPAIGN]}</td>
        <td>${r[PLACEMENT]}</td>
        <td>${spend.toFixed(0)}</td>
        <td>${revenue.toFixed(0)}</td>
        <td>${r[UNITS]}</td>
        <td>${roi}</td>
      </tr>
    `;
  });
}
