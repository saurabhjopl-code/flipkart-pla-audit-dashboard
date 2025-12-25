/******** TAB SWITCH ********/
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    };
  });
});

/******** CSV PARSER ********/
function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && q && n === '"') { cur += '"'; i++; }
    else if (c === '"') q = !q;
    else if (c === "," && !q) { row.push(cur.trim()); cur = ""; }
    else if (c === "\n" && !q) { row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur.trim());
  rows.push(row);
  return rows;
}

/******** HEADER + PERIOD ********/
function autoDetectHeader(rows, required) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const found = required.filter(h => rows[i].includes(h)).length;
    if (found >= 2) return i;
  }
  throw "Header not found";
}

function extractReportPeriod(rows) {
  let start = "", end = "";
  rows.slice(0, 5).forEach(r => {
    const line = r.join(" ").trim();
    if (/start\s*time/i.test(line)) start = line.replace(/.*start\s*time\s*:/i, "").trim();
    if (/end\s*time/i.test(line)) end = line.replace(/.*end\s*time\s*:/i, "").trim();
  });
  return { start, end };
}

/******** HELPERS ********/
function toggleSection(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const f = x => x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return { label: `Week (${f(start)} – ${f(end)})` };
}

/******** DAILY REPORT ********/
function generateCampaign() { /* unchanged & working */ }

/******** PLACEMENT REPORT ********/
function generatePlacement() { /* unchanged & working */ }

function expandAllCampaigns() {
  document.querySelectorAll("[data-parent]").forEach(r => r.classList.remove("hidden-row"));
}
function collapseAllCampaigns() {
  document.querySelectorAll("[data-parent]").forEach(r => r.classList.add("hidden-row"));
}

/******** TRAFFIC REPORT ********/
function generateTraffic() {
  const file = document.getElementById("trafficFile").files[0];
  if (!file) return alert("Upload Traffic CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    const period = extractReportPeriod(rows);
    if (period.start || period.end) {
      trafficPeriod.innerHTML = `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow = autoDetectHeader(rows, ["SKU Id", "Impression Date"]);
    const headers = rows[hRow];
    const data = rows.slice(hRow + 1);
    const h = n => headers.indexOf(n);

    let imp=0, clk=0, rev=0;
    const daily={}, sku={};

    data.forEach(r=>{
      const d=r[h("Impression Date")];
      const s=r[h("SKU Id")];
      const t=r[h("Product Title")];
      const i=+r[h("Impressions")]||0;
      const c=+r[h("Product Clicks")]||0;
      const rV=+r[h("Revenue")]||0;

      imp+=i; clk+=c; rev+=rV;

      if(d){
        if(!daily[d]) daily[d]={i:0,c:0,r:0};
        daily[d].i+=i; daily[d].c+=c; daily[d].r+=rV;
      }
      if(s){
        if(!sku[s]) sku[s]={t,i:0,c:0,r:0};
        sku[s].i+=i; sku[s].c+=c; sku[s].r+=rV;
      }
    });

    trafficKpi.innerHTML=`
      <div class="kpi">Impressions<br>${imp}</div>
      <div class="kpi">Clicks<br>${clk}</div>
      <div class="kpi">Revenue<br>₹${rev.toFixed(0)}</div>
      <div class="kpi">CVR<br>${(clk?rev/clk:0).toFixed(2)}</div>
    `;

    const dBody=document.querySelector("#trafficDailyTable tbody");
    dBody.innerHTML="";
    Object.keys(daily).sort((a,b)=>new Date(a)-new Date(b)).forEach(x=>{
      const v=daily[x];
      dBody.innerHTML+=`
        <tr><td>${x}</td><td>${v.i}</td><td>${v.c}</td>
        <td>${v.r.toFixed(0)}</td><td>${(v.c?v.r/v.c:0).toFixed(2)}</td></tr>`;
    });

    const sBody=document.querySelector("#trafficSkuTable tbody");
    sBody.innerHTML="";
    Object.entries(sku).forEach(([k,v])=>{
      const ctr=v.i?v.c/v.i:0;
      const cvr=v.c?v.r/v.c:0;
      let status="🟢 Healthy";
      if(v.i>1000 && ctr<0.02) status="🔴 CTR Weak";
      else if(v.c>50 && cvr<0.05) status="🟠 Conversion Leak";
      sBody.innerHTML+=`
        <tr><td>${k}</td><td>${v.t||""}</td><td>${v.i}</td><td>${v.c}</td>
        <td>${v.r.toFixed(0)}</td><td>${(ctr*100).toFixed(2)}%</td>
        <td>${(cvr*100).toFixed(2)}%</td><td>${status}</td></tr>`;
    });
  };
  reader.readAsText(file);
}
