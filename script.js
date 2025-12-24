/* TAB SWITCH */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* CSV PARSER */
function parseCSV(text) {
  const rows = [];
  let row = [], current = "", inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && inQuotes && n === '"') { current += '"'; i++; }
    else if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) { row.push(current.trim()); current = ""; }
    else if (c === "\n" && !inQuotes) { row.push(current.trim()); rows.push(row); row = []; current = ""; }
    else current += c;
  }
  row.push(current.trim());
  rows.push(row);
  return rows;
}

const roiClass = roi => roi < 3 ? "roi-red" : roi <= 5 ? "roi-orange" : "roi-green";

/* CAMPAIGN */
function generateCampaign() {
  const file = campaignFile.files[0];
  campaignError.innerText = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const data = parseCSV(reader.result);
    const h = n => data[0].indexOf(n);

    if (h("Campaign Name") === -1) {
      campaignError.innerText = "Invalid Campaign CSV format";
      return;
    }

    let spend = 0, revenue = 0, units = 0;
    const map = {};

    data.slice(1).forEach(r => {
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

    campaignKpi.innerHTML = `
      <div class="kpi">Spend<br>₹${spend.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${revenue.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(revenue/spend).toFixed(2)}</div>
      <div class="kpi">Units<br>${units}</div>
    `;

    const tbody = campaignTable.querySelector("tbody");
    tbody.innerHTML = "";

    Object.entries(map).sort((a,b)=>b[1].spend-a[1].spend).forEach(([n,c])=>{
      const roi = c.revenue/c.spend;
      const flag = roi<3?"🔴 Loss":roi<=5?"🟠 Optimize":"🟢 Scale";
      tbody.innerHTML += `
        <tr>
          <td>${n}</td><td>${c.spend.toFixed(0)}</td>
          <td>${c.revenue.toFixed(0)}</td><td>${c.units}</td>
          <td>${roi.toFixed(2)}</td><td>${flag}</td>
        </tr>`;
    });
  };
  reader.readAsText(file);
}

/* PLACEMENT */
function generatePlacement() {
  const file = placementFile.files[0];
  placementError.innerText = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const data = parseCSV(reader.result);
    const h = n => data[0].indexOf(n);

    const overall = {}, pivot = {};

    data.slice(1).forEach(r => {
      const campaign = r[h("Campaign Name")];
      const placement = r[h("Placement Type")];
      if (!campaign || !placement) return;

      const spend = +r[h("Ad Spend")] || 0;
      const units = (+r[h("Direct Units Sold")]||0)+(+r[h("Indirect Units Sold")]||0);
      const revenue = (+r[h("Direct Revenue")]||0)+(+r[h("Indirect Revenue")]||0);

      if (!overall[placement]) overall[placement]={spend:0,revenue:0,units:0};
      overall[placement].spend+=spend;
      overall[placement].revenue+=revenue;
      overall[placement].units+=units;

      if (!pivot[campaign]) pivot[campaign]={};
      if (!pivot[campaign][placement]) pivot[campaign][placement]={spend:0,revenue:0,units:0};
      pivot[campaign][placement].spend+=spend;
      pivot[campaign][placement].revenue+=revenue;
      pivot[campaign][placement].units+=units;
    });

    /* OVERALL TABLE */
    const oBody = placementOverallTable.querySelector("tbody");
    oBody.innerHTML = "";
    Object.entries(overall).forEach(([p,c])=>{
      const roi = c.revenue/c.spend;
      oBody.innerHTML += `
        <tr class="${roiClass(roi)}">
          <td>${p}</td><td>${c.spend.toFixed(0)}</td>
          <td>${c.revenue.toFixed(0)}</td><td>${c.units}</td>
          <td>${roi.toFixed(2)}</td>
        </tr>`;
    });

    /* CAMPAIGN-WISE */
    const cBody = placementCampaignTable.querySelector("tbody");
    cBody.innerHTML = "";
    Object.keys(pivot).forEach(camp=>{
      cBody.innerHTML += `<tr class="campaign-group"><td colspan="6">${camp}</td></tr>`;
      const entries = Object.entries(pivot[camp]);
      let best = entries.reduce((a,b)=> (b[1].revenue/b[1].spend)>(a[1].revenue/a[1].spend)?b:a);
      entries.forEach(([p,c])=>{
        const roi=c.revenue/c.spend;
        cBody.innerHTML += `
          <tr class="${roiClass(roi)} ${p===best[0]?'best-placement':''}">
            <td></td><td>${p}${p===best[0]?' ⭐':''}</td>
            <td>${c.spend.toFixed(0)}</td>
            <td>${c.revenue.toFixed(0)}</td>
            <td>${c.units}</td>
            <td>${roi.toFixed(2)}</td>
          </tr>`;
      });
    });
  };
  reader.readAsText(file);
}
