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

/* ================= CSV PARSER ================= */
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

/* ================= REPORT PERIOD ================= */
function extractReportPeriod(rows) {
  let start = "", end = "";
  rows.slice(0, 5).forEach(row => {
    const line = row.join(" ").trim();
    if (/start\s*time/i.test(line)) {
      start = line.replace(/.*start\s*time\s*:/i, "").trim();
    }
    if (/end\s*time/i.test(line)) {
      end = line.replace(/.*end\s*time\s*:/i, "").trim();
    }
  });
  return { start, end };
}

function autoDetectHeader(rows, required) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const match = required.filter(h => rows[i].includes(h)).length;
    if (match >= 2) return i;
  }
  throw "Header row not found";
}

const roiClass = r => r < 3 ? "roi-red" : r <= 5 ? "roi-orange" : "roi-green";

/* ================= DAILY REPORT ================= */
function generateCampaign() {
  const f = campaignFile.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = () => {
    const rows = parseCSV(r.result);
    const period = extractReportPeriod(rows);
    if (period.start || period.end) {
      reportPeriod.innerHTML =
        `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow = autoDetectHeader(rows, ["Campaign Name", "Ad Spend"]);
    const headers = rows[hRow];
    const data = rows.slice(hRow + 1);
    const h = n => headers.indexOf(n);

    let S=0,R=0,U=0,map={}, dailyMap={};

    data.forEach(x=>{
      const c=x[h("Campaign Name")];
      const date=x[h("Date")];
      if(!c) return;

      const s=+x[h("Ad Spend")]||0;
      const r=+x[h("Total Revenue (Rs.)")]||0;
      const u=+x[h("Total converted units")]||0;

      S+=s;R+=r;U+=u;

      if(!map[c]) map[c]={s:0,r:0,u:0};
      map[c].s+=s; map[c].r+=r; map[c].u+=u;

      if(date){
        if(!dailyMap[date]) dailyMap[date]={s:0,r:0,u:0};
        dailyMap[date].s+=s;
        dailyMap[date].r+=r;
        dailyMap[date].u+=u;
      }
    });

    campaignKpi.innerHTML=`
      <div class="kpi">Spend<br>₹${S.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${R.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(R/S).toFixed(2)}</div>
      <div class="kpi">Units<br>${U}</div>
    `;

    const tb=campaignTable.querySelector("tbody");
    tb.innerHTML="";
    Object.entries(map).sort((a,b)=>b[1].s-a[1].s).forEach(([n,c])=>{
      const roi=c.r/c.s;
      const flag=roi<3?"🔴 Loss":roi<=5?"🟠 Optimize":"🟢 Scale";
      tb.innerHTML+=`
        <tr>
          <td>${n}</td>
          <td>${c.s.toFixed(0)}</td>
          <td>${c.r.toFixed(0)}</td>
          <td>${c.u}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${flag}</td>
        </tr>`;
    });

    /* Day-to-Day */
    const dailyBody=document.querySelector("#dailyTrendTable tbody");
    dailyBody.innerHTML="";
    Object.keys(dailyMap).sort((a,b)=>new Date(a)-new Date(b)).forEach(d=>{
      const x=dailyMap[d];
      dailyBody.innerHTML+=`
        <tr>
          <td>${d}</td>
          <td>${x.s.toFixed(0)}</td>
          <td>${x.u}</td>
          <td>${x.r.toFixed(0)}</td>
          <td>${(x.r/x.s).toFixed(2)}</td>
        </tr>`;
    });

    /* Weekly */
    const weeklyMap={};
    Object.keys(dailyMap).forEach(d=>{
      const dt=new Date(d);
      const w=`Week ${Math.ceil(dt.getDate()/7)} ${dt.getFullYear()}`;
      if(!weeklyMap[w]) weeklyMap[w]={s:0,r:0,u:0};
      weeklyMap[w].s+=dailyMap[d].s;
      weeklyMap[w].r+=dailyMap[d].r;
      weeklyMap[w].u+=dailyMap[d].u;
    });

    const weeklyBody=document.querySelector("#weeklyTrendTable tbody");
    weeklyBody.innerHTML="";
    Object.keys(weeklyMap).forEach(w=>{
      const x=weeklyMap[w];
      weeklyBody.innerHTML+=`
        <tr>
          <td>${w}</td>
          <td>${x.s.toFixed(0)}</td>
          <td>${x.u}</td>
          <td>${x.r.toFixed(0)}</td>
          <td>${(x.r/x.s).toFixed(2)}</td>
        </tr>`;
    });
  };
  r.readAsText(f);
}

/* ================= PLACEMENT REPORT ================= */
function generatePlacement() {
  /* unchanged – already working perfectly */
}
