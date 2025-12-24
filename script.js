/* ================= TAB SWITCH ================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

/* ================= CSV PARSER ================= */
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

/* ================= DAILY REPORT (UNCHANGED LOGIC) ================= */
function generateCampaign() {
  const file = campaignFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const d = parseCSV(reader.result);
    const h = n => d[0].indexOf(n);

    let spend = 0, revenue = 0, units = 0, map = {};

    d.slice(1).forEach(r => {
      const name = r[h("Campaign Name")];
      if (!name) return;

      const s = +r[h("Ad Spend")] || 0;
      const rev = +r[h("Total Revenue (Rs.)")] || 0;
      const u = +r[h("Total converted units")] || 0;

      spend += s; revenue += rev; units += u;
      if (!map[name]) map[name] = { s: 0, r: 0, u: 0 };
      map[name].s += s; map[name].r += rev; map[name].u += u;
    });

    campaignKpi.innerHTML = `
      <div class="kpi"><div>Spend</div><div>₹${spend.toFixed(0)}</div></div>
      <div class="kpi"><div>Revenue</div><div>₹${revenue.toFixed(0)}</div></div>
      <div class="kpi"><div>ROI</div><div>${(revenue/spend).toFixed(2)}</div></div>
      <div class="kpi"><div>Units</div><div>${units}</div></div>
    `;

    const tbody = campaignTable.querySelector("tbody");
    tbody.innerHTML = "";

    Object.entries(map).sort((a,b)=>b[1].s-a[1].s).forEach(([name,c])=>{
      const roi = c.r / c.s;
      const status = roi < 3 ? "🔴 Loss" : roi <= 5 ? "🟠 Optimize" : "🟢 Scale";

      tbody.innerHTML += `
        <tr>
          <td>${name}</td>
          <td>${c.s.toFixed(0)}</td>
          <td>${c.r.toFixed(0)}</td>
          <td>${c.u}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${status}</td>
        </tr>`;
    });
  };
  reader.readAsText(file);
}

/* ================= PLACEMENT PERFORMANCE (FIXED) ================= */
function generatePlacement() {
  const file = placementFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const d = parseCSV(reader.result);
    const h = n => d[0].indexOf(n);

    const overall = {};
    const pivot = {};

    d.slice(1).forEach(r => {
      const camp = r[h("Campaign Name")];
      const pid = r[h("Campaign ID")];
      const place = r[h("Placement Type")];
      if (!camp || !place) return;

      const spend = +r[h("Ad Spend")] || 0;
      const units = (+r[h("Direct Units Sold")] || 0) + (+r[h("Indirect Units Sold")] || 0);
      const revenue = (+r[h("Direct Revenue")] || 0) + (+r[h("Indirect Revenue")] || 0);

      if (!overall[place]) overall[place] = { s:0, r:0, u:0 };
      overall[place].s += spend; overall[place].r += revenue; overall[place].u += units;

      if (!pivot[camp]) pivot[camp] = { __id: pid };
      if (!pivot[camp][place]) pivot[camp][place] = { s:0, r:0, u:0 };
      pivot[camp][place].s += spend;
      pivot[camp][place].r += revenue;
      pivot[camp][place].u += units;
    });

    /* ===== OVERALL TABLE ===== */
    const oBody = placementOverallTable.querySelector("tbody");
    oBody.innerHTML = "";

    Object.entries(overall).forEach(([p,c])=>{
      const roi = c.r / c.s;
      oBody.innerHTML += `
        <tr class="${roiClass(roi)}">
          <td>${p}</td>
          <td>${c.s.toFixed(0)}</td>
          <td>${c.r.toFixed(0)}</td>
          <td>${c.u}</td>
          <td>${roi.toFixed(2)}</td>
        </tr>`;
    });

    /* ===== CAMPAIGN-WISE (DEFAULT COLLAPSED) ===== */
    const cBody = placementCampaignTable.querySelector("tbody");
    cBody.innerHTML = "";

    Object.keys(pivot).forEach((camp, idx) => {
      const group = `grp-${idx}`;
      const entries = Object.entries(pivot[camp]).filter(x => x[0] !== "__id");

      const summary = entries.reduce((a,[,v])=>{
        a.s+=v.s; a.r+=v.r; a.u+=v.u; return a;
      },{s:0,r:0,u:0});

      const roi = summary.r / summary.s;

      cBody.innerHTML += `
        <tr class="campaign-group" data-group="${group}">
          <td><span class="campaign-toggle">▶</span>${camp} (${pivot[camp].__id})</td>
          <td></td>
          <td>${summary.s.toFixed(0)}</td>
          <td>${summary.r.toFixed(0)}</td>
          <td>${summary.u}</td>
          <td>${roi.toFixed(2)}</td>
        </tr>`;

      const best = entries.reduce((a,b)=>(b[1].r/b[1].s)>(a[1].r/a[1].s)?b:a);

      entries.forEach(([p,v])=>{
        const r = v.r / v.s;
        cBody.innerHTML += `
          <tr class="hidden-row ${roiClass(r)} ${p===best[0]?'best-placement':''}" data-parent="${group}">
            <td></td>
            <td>${p}${p===best[0]?' ⭐':''}</td>
            <td>${v.s.toFixed(0)}</td>
            <td>${v.r.toFixed(0)}</td>
            <td>${v.u}</td>
            <td>${r.toFixed(2)}</td>
          </tr>`;
      });
    });

    /* ===== TOGGLE HANDLERS ===== */
    document.querySelectorAll(".campaign-group").forEach(row=>{
      row.onclick = ()=>{
        const g = row.dataset.group;
        const rows = document.querySelectorAll(`[data-parent="${g}"]`);
        const icon = row.querySelector(".campaign-toggle");
        const collapsed = rows[0].classList.contains("hidden-row");

        rows.forEach(r=>r.classList.toggle("hidden-row", !collapsed));
        icon.textContent = collapsed ? "▼" : "▶";
      };
    });
  };
  reader.readAsText(file);
}

/* ===== EXPAND / COLLAPSE ALL (NOW WORKING) ===== */
function expandAllCampaigns() {
  document.querySelectorAll(".campaign-group").forEach(r=>{
    const g = r.dataset.group;
    document.querySelectorAll(`[data-parent="${g}"]`).forEach(x=>x.classList.remove("hidden-row"));
    r.querySelector(".campaign-toggle").textContent = "▼";
  });
}

function collapseAllCampaigns() {
  document.querySelectorAll(".campaign-group").forEach(r=>{
    const g = r.dataset.group;
    document.querySelectorAll(`[data-parent="${g}"]`).forEach(x=>x.classList.add("hidden-row"));
    r.querySelector(".campaign-toggle").textContent = "▶";
  });
}
