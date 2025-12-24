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
    const headers = data[0];

    const h = name => headers.indexOf(name);

    if (
      h("Campaign Name") === -1 ||
      h("Ad Spend") === -1 ||
      h("Total Revenue (Rs.)") === -1 ||
      h("Total Converted Units") === -1
    ) {
      errorBox.innerText = "Invalid Campaign Performance CSV format.";
      return;
    }

    const rows = data.slice(1);
    const map = {};
    let spend = 0, revenue = 0, units = 0;

    rows.forEach(r => {
      const name = r[h("Campaign Name")];
      if (!name) return;

      const s = +r[h("Ad Spend")] || 0;
      const rev = +r[h("Total Revenue (Rs.)")] || 0;
      const u = +r[h("Total Converted Units")] || 0;

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
          roi < 3 ? "🔴 Loss" :
          roi <= 5 ? "🟠 Optimize" : "🟢 Scale";

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
    const headers = data[0];
    const h = name => headers.indexOf(name);

    if (
      h("Campaign Name") === -1 ||
      h("Placement") === -1 ||
      h("Ad Spend") === -1 ||
      h("Total Revenue (Rs.)") === -1 ||
      h("Total Converted Units") === -1
    ) {
      errorBox.innerText = "Invalid Placement Performance CSV format.";
      return;
    }

    const tbody = document.querySelector("#placementTable tbody");
    tbody.innerHTML = "";

    data.slice(1).forEach(r => {
      if (!r[h("Placement")]) return;

      const spend = +r[h("Ad Spend")] || 0;
      const revenue = +r[h("Total Revenue (Rs.)")] || 0;
      const units = +r[h("Total Converted Units")] || 0;
      const roi = spend ? (revenue / spend).toFixed(2) : "∞";

      tbody.innerHTML += `
        <tr>
          <td>${r[h("Campaign Name")]}</td>
          <td>${r[h("Placement")]}</td>
          <td>${spend.toFixed(0)}</td>
          <td>${revenue.toFixed(0)}</td>
          <td>${units}</td>
          <td>${roi}</td>
        </tr>
      `;
    });
  };
  reader.readAsText(file);
}
