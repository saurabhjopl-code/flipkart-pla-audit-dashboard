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
    reader.onload = () => routeFile(reader.result);
    reader.readAsText(file);
  });
}

/* ================= CSV PARSER (ROBUST) ================= */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"' && inQuotes && n === '"') {
      current += '"';
      i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if (c === "\n" && !inQuotes) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += c;
    }
  }

  row.push(current.trim());
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

/* ================= ROUTER ================= */
function routeFile(csvText) {
  const data = parseCSV(csvText);
  const rawHeaders = data[0];
  const headers = rawHeaders.map(h => normalize(h));

  // CAMPAIGN FILE IDENTIFICATION
  const isCampaign =
    headers.includes("campaignname") &&
    headers.includes("adspend") &&
    headers.includes("totalrevenuers");

  // PLACEMENT FILE IDENTIFICATION
  const isPlacement =
    headers.includes("placement") &&
    headers.includes("spend") &&
    headers.includes("revenue");

  if (isCampaign) {
    processCampaign(data, headers);
  }

  if (isPlacement) {
    processPlacement(data, headers);
  }
}

/* ================= CAMPAIGN PERFORMANCE ================= */
function processCampaign(data, headers) {
  const rows = data.slice(1);

  const IDX = {
    CAMPAIGN: headers.indexOf("campaignname"),
    SPEND: headers.indexOf("adspend"),
    UNITS: headers.indexOf("totalconvertedunits"),
    REVENUE: headers.indexOf("totalrevenuers")
  };

  let totalSpend = 0, totalRevenue = 0, totalUnits = 0;
  const campaigns = {};

  rows.forEach(r => {
    const name = r[IDX.CAMPAIGN];
    if (!name) return;

    const spend = parseFloat(r[IDX.SPEND]) || 0;
    const units = parseFloat(r[IDX.UNITS]) || 0;
    const revenue = parseFloat(r[IDX.REVENUE]) || 0;

    totalSpend += spend;
    totalRevenue += revenue;
    totalUnits += units;

    if (!campaigns[name]) {
      campaigns[name] = { spend: 0, revenue: 0, units: 0 };
    }

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
function processPlacement(data, headers) {
  const rows = data.slice(1);

  const IDX = {
    CAMPAIGN: headers.indexOf("campaignname"),
    PLACEMENT: headers.indexOf("placement"),
    SPEND: headers.indexOf("spend"),
    UNITS: headers.indexOf("units"),
    REVENUE: headers.indexOf("revenue")
  };

  const tbody = document.querySelector("#placementTable tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    const placement = r[IDX.PLACEMENT];
    if (!placement) return;

    const spend = parseFloat(r[IDX.SPEND]) || 0;
    const revenue = parseFloat(r[IDX.REVENUE]) || 0;
    const units = parseFloat(r[IDX.UNITS]) || 0;

    const roi = spend ? (revenue / spend).toFixed(2) : "∞";

    tbody.innerHTML += `
      <tr>
        <td>${r[IDX.CAMPAIGN]}</td>
        <td>${placement}</td>
        <td>${spend.toFixed(0)}</td>
        <td>${revenue.toFixed(0)}</td>
        <td>${units}</td>
        <td>${roi}</td>
      </tr>
    `;
  });
}
