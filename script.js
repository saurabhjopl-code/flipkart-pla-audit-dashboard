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

/* =============== CSV PARSER =============== */
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

/* =============== PERIOD EXTRACTION =============== */
function extractReportPeriod(rows) {
  let start = "", end = "";
  rows.slice(0, 5).forEach(row => {
    const line = row.join(" ").trim();
    if (/start\s*time/i.test(line)) start = line.replace(/.*:/, "").trim();
    if (/end\s*time/i.test(line)) end = line.replace(/.*:/, "").trim();
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

function toggleSection(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

/* =============== WEEK RANGE =============== */
function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const format = x =>
    x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const weekNo = Math.ceil(
    (((start - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7
  );

  return {
    key: `W${weekNo}-${d.getFullYear()}`,
    label: `Week ${weekNo} (${format(start)} – ${format(end)})`
  };
}

/* =============== DAILY REPORT =============== */
function generateCampaign() {
  const f = campaignFile.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = () => {
    const rows = parseCSV(r.result);
    const period = extractReportPeriod(rows);
    if (period.start || period.end) {
      reportPeriod.innerHTML = `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow = autoDetectHeader(rows, ["Campaign Name", "Ad Spend"]);
    const headers = rows[hRow];
    const data = rows.slice(hRow + 1);
    const h = n => headers.indexOf(n);

    let S=0,R=0,U=0,map={}, dailyMap={};

    data.forEach(x=>{
      const c=x[h("Campaign Name")];
      const d=x[h("Date")];
      if(!c) return;

      const s=+x[h("Ad Spend")]||0;
      const r=+x[h("Total Revenue (Rs.)")]||0;
      const u=+x[h("Total converted units")]||0;

      S+=s;R+=r;U+=u;

      if(!map[c]) map[c]={s:0,r:0,u:0};
      map[c].s+=s; map[c].r+=r; map[c].u+=u;

      if(d){
        if(!dailyMap[d]) dailyMap[d]={s:0,r:0,u:0};
        dailyMap[d].s+=s; dailyMap[d].r+=r; dailyMap[d].u+=u;
      }
    });

    campaignKpi.innerHTML = `
      <div class="kpi">Spend<br>₹${S.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${R.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(R/S).toFixed(2)}</div>
      <div class="kpi">Units<br>${U}</div>
    `;

    const tb = campaignTable.querySelector("tbody");
    tb.innerHTML = "";
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
      const wk=getWeekRange(d);
      if(!weeklyMap[wk.key]) weeklyMap[wk.key]={label:wk.label,s:0,r:0,u:0};
      weeklyMap[wk.key].s+=dailyMap[d].s;
      weeklyMap[wk.key].r+=dailyMap[d].r;
      weeklyMap[wk.key].u+=dailyMap[d].u;
    });

    const weeklyBody=document.querySelector("#weeklyTrendTable tbody");
    weeklyBody.innerHTML="";
    Object.values(weeklyMap).forEach(w=>{
      weeklyBody.innerHTML+=`
        <tr>
          <td>${w.label}</td>
          <td>${w.s.toFixed(0)}</td>
          <td>${w.u}</td>
          <td>${w.r.toFixed(0)}</td>
          <td>${(w.r/w.s).toFixed(2)}</td>
        </tr>`;
    });
  };
  r.readAsText(f);
}
