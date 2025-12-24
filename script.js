document.getElementById("csvFile").addEventListener("change", function (e) {
  const reader = new FileReader();
  reader.onload = () => processCSV(reader.result);
  reader.readAsText(e.target.files[0]);
});

function processCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");
  const rows = lines.slice(1);

  let totalSpend = 0;
  let totalRevenue = 0;
  let totalUnits = 0;

  const tbody = document.querySelector("#campaignTable tbody");
  tbody.innerHTML = "";

  rows.forEach(row => {
    const c = row.split(",");

    if (!c[0]) return;

    const campaign = c[1];
    const spend = parseFloat(c[3]) || 0;
    const units = parseFloat(c[6]) || 0;
    const revenue = parseFloat(c[7]) || 0;

    if (spend === 0) return;

    const roi = revenue / spend;

    totalSpend += spend;
    totalRevenue += revenue;
    totalUnits += units;

    let flag = "";
    let rowClass = "";

    // ✅ YOUR ROI LOGIC
    if (roi < 3) {
      flag = "🔴 Loss / Critical";
      rowClass = "red";
    } else if (roi >= 3 && roi <= 5) {
      flag = "🟠 Needs Optimization";
      rowClass = "orange";
    } else {
      flag = "🟢 Scale Candidate";
      rowClass = "green";
    }

    const tr = document.createElement("tr");
    tr.className = rowClass;

    tr.innerHTML = `
      <td>${campaign}</td>
      <td>${spend.toFixed(0)}</td>
      <td>${revenue.toFixed(0)}</td>
      <td>${units}</td>
      <td>${roi.toFixed(2)}</td>
      <td>${flag}</td>
    `;

    tbody.appendChild(tr);
  });

  const overallROI = totalRevenue / totalSpend;

  let overallClass =
    overallROI < 3 ? "red" :
    overallROI <= 5 ? "orange" : "green";

  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><span>Total Spend</span>₹${totalSpend.toFixed(0)}</div>
    <div class="kpi"><span>Total Revenue</span>₹${totalRevenue.toFixed(0)}</div>
    <div class="kpi ${overallClass}">
      <span>Overall ROI</span>${overallROI.toFixed(2)}
    </div>
    <div class="kpi"><span>Total Units</span>${totalUnits}</div>
    <div class="kpi"><span>Campaigns</span>${rows.length}</div>
  `;
}
