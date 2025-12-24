document.getElementById("fileInput").addEventListener("change", handleFiles);

// TAB SWITCH
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

function handleFiles(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => detectAndProcess(file.name, reader.result);
    reader.readAsText(file);
  });
}

function parseCSV(text) {
  return text.trim().split("\n").map(r => r.split(","));
}

function detectAndProcess(filename, csv) {
  const data = parseCSV(csv);
  const headers = data[0].map(h => h.trim().toLowerCase());

  if (headers.includes("placement")) {
    processPlacement(data.slice(1));
  } else {
    processCampaign(data.slice(1));
  }
}

/* ================= CAMPAIGN ================= */
function processCampaign(rows) {
  const map = {};
  let spend = 0, revenue = 0, units = 0;

  rows.forEach(r => {
    const name = r[1];
    const s = +r[3] || 0;
    const u = +r[6] || 0;
    const rev = +r[7] || 0;

    if (!name) return;

    spend += s; revenue += rev; units += u;

    if (!map[name]) map[name] = { spend: 0, revenue: 0, units: 0 };
    map[name].spend += s;
    map[name].revenue += rev;
    map[name].units += u;
  });

  document.getElementById("campaignKpi").innerHTML = `
    <div class="kpi">Spend<br>₹${spend.toFixed(0)}</div>
    <div class="kpi">Revenue<br>₹${revenue.toFixed(0)}</div>
    <div class="kpi">ROI<br>${(revenue / spend).toFixed(2)}</div>
    <div class="kpi">Units<br>${units}</div>
  `;

  const tbody = document.querySelector("#campaignTable tbody");
  tbody.innerHTML = "";

  Object.entries(map)
    .sort((a, b) => b[1].spend - a[1].spend)
    .forEach(([name, c]) => {
      const roi = c.revenue / c.spend;
      const cls = roi < 3 ? "red" : roi <= 5 ? "orange" : "green";

      tbody.innerHTML += `
        <tr class="${cls}">
          <td>${name}</td>
          <td>${c.spend.toFixed(0)}</td>
          <td>${c.revenue.toFixed(0)}</td>
          <td>${c.units}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${cls}</td>
        </tr>
      `;
    });
}

/* ================= PLACEMENT ================= */
function processPlacement(rows) {
  const tbody = document.querySelector("#placementTable tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    const campaign = r[0];
    const placement = r[1];
    const spend = +r[4] || 0;
    const units = +r[6] || 0;
    const revenue = +r[7] || 0;
    const roi = spend ? (revenue / spend).toFixed(2) : "∞";

    if (!placement) return;

    tbody.innerHTML += `
      <tr>
        <td>${campaign}</td>
        <td>${placement}</td>
        <td>${spend.toFixed(0)}</td>
        <td>${revenue.toFixed(0)}</td>
        <td>${units}</td>
        <td>${roi}</td>
      </tr>
    `;
  });
}
