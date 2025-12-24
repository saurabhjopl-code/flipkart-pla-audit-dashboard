/* ================= TAB SWITCH ================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* ================= CSV PARSER ================= */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"' && inQuotes && n === '"') {
      current += '"'; i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      row.push(current.trim()); current = "";
    } else if (c === "\n" && !inQuotes) {
      row.push(current.trim()); rows.push(row);
      row = []; current = "";
    } else {
      current += c;
    }
  }

  row.push(current.trim());
  rows.push(row);
  return rows;
}

/* ================= CAMPAIGN ================= */
function generateCampaign() {
  const file = document.getElementById("campaignFile").files[0];
  const errorBox = document.getElementById("campaignError");
  errorBox.innerText = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const data = parseCSV(reader.result);
    const h = name => data[0].indexOf(name);

    if (
      h("Campaign Name") === -1 ||
      h("Ad Spend") === -1 ||
      h("Total Revenue (Rs.)") === -1 ||
      h("Total converted units") === -1
    ) {
      errorBox.innerText = "Invalid Campaign Performance CSV format.";
      return;
    }

    const rows = data.slice(1);
    let spend = 0, revenue = 0, units = 0;
    const map = {};

    rows.forEach(r => {
      const name = r[h("Campaign Name")];
      if (!name) return;

      const s = +r[h("Ad Spend")] || 0;
      const rev = +r[h("Total Revenue (Rs.)")] || 0;
      const u = +r[h("Total converted units")] || 0;

      spend += s; revenue += rev; units += u;

      if (!map[name]) map[name] = { spend: 0, revenue: 0, units: 0 };
      map[name].spend += s;
      map[name].revenue += rev;
      map[name].units += u;
    });

    document.getElementById("campaignKpi").innerHTML = `
      <div class="kpi">Spend<br>₹${spend.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${revenue.toFixed(0)}</div>
      <div class="kpi">ROI<br>${spend ? (revenue / spend).toFixed(2) : "∞"}</div>
      <div class="kpi">Units<br>${units}</div>
    `;

    const tbody = document.querySelector("#campaignTable tbody");
    tbody.innerHTML = "";

    Object.entries(map)
      .sort((a, b) => b[1].spend - a[1].spend)
      .forEach(([name, c]) => {
        const roi = c.spend ? c.revenue / c.spend : Infinity;
        const flag =
          roi < 3 ? "🔴 Loss / Critical" :
          roi <= 5 ? "🟠 Needs Optimization" :
          "🟢 Scale Candidate";

        tbody.innerHTML += `
          <tr>
            <td>${name}</td>
            <td>${c.spend.toFixed(0)}</td>
            <td>${c.revenue.toFixed(0)}</td>
            <td>${c.units}</td>
            <td>${roi === Infinity ? "∞" : roi.toFixed(2)}</td>
            <td>${flag}</td>
          </tr>
        `;
      });
  };
  reader.readAsText(file);
}

/* ================= PLACEMENT ================= */
function generatePlacement() {
  const file = document.getElementById("placementFile").files[0];
  const errorBox = document.getElementById("placementError");
  errorBox.innerText = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const data = parseCSV(reader.result);
    const h = name => data[0].indexOf(name);

    if (
      h("Campaign Name") === -1 ||
      h("Placement Type") === -1 ||
      h("Ad Spend") === -1 ||
      h("Direct Units Sold") === -1 ||
      h("Indirect Units Sold") === -1 ||
      h("Direct Revenue") === -1 ||
      h("Indirect Revenue") === -1
    ) {
      errorBox.innerText = "Invalid Placement Performance CSV format.";
      return;
    }

    const overall = {};
    const pivot = {};

    data.slice(1).forEach(r => {
      const campaign = r[h("Campaign Name")];
      const placement = r[h("Placement Type")];
      if (!campaign || !placement) return;

      const spend = +r[h("Ad Spend")] || 0;
      const units =
        (+r[h("Direct Units Sold")] || 0) +
        (+r[h("Indirect Units Sold")] || 0);
      const revenue =
        (+r[h("Direct Revenue")] || 0) +
        (+r[h("Indirect Revenue")] || 0);

      /* OVERALL */
      if (!overall[placement]) overall[placement] = { spend: 0, revenue: 0, units: 0 };
      overall[placement].spend += spend;
      overall[placement].revenue += revenue;
      overall[placement].units += units;

      /* CAMPAIGN → PLACEMENT */
      if (!pivot[campaign]) pivot[campaign] = {};
      if (!pivot[campaign][placement]) {
        pivot[campaign][placement] = { spend: 0, revenue: 0, units: 0 };
      }

      pivot[campaign][placement].spend += spend;
      pivot[campaign][placement].revenue += revenue;
      pivot[campaign][placement].units += units;
    });

    /* TABLE 1 */
    const overallBody = document.querySelector("#placementOverallTable tbody");
    overallBody.innerHTML = "";

    Object.entries(overall)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .forEach(([placement, c]) => {
        const roi = c.spend ? (c.revenue / c.spend).toFixed(2) : "∞";
        overallBody.innerHTML += `
          <tr>
            <td>${placement}</td>
            <td>${c.spend.toFixed(0)}</td>
            <td>${c.revenue.toFixed(0)}</td>
            <td>${c.units}</td>
            <td>${roi}</td>
          </tr>
        `;
      });

    /* TABLE 2 – PIVOT STYLE */
    const campaignBody = document.querySelector("#placementCampaignTable tbody");
    campaignBody.innerHTML = "";

    Object.keys(pivot).forEach(campaign => {
      campaignBody.innerHTML += `
        <tr style="background:#f1f3f5;font-weight:600;">
          <td colspan="6">${campaign}</td>
        </tr>
      `;

      Object.entries(pivot[campaign])
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .forEach(([placement, c]) => {
          const roi = c.spend ? (c.revenue / c.spend).toFixed(2) : "∞";
          campaignBody.innerHTML += `
            <tr>
              <td></td>
              <td>${placement}</td>
              <td>${c.spend.toFixed(0)}</td>
              <td>${c.revenue.toFixed(0)}</td>
              <td>${c.units}</td>
              <td>${roi}</td>
            </tr>
          `;
        });
    });
  };

  reader.readAsText(file);
}
