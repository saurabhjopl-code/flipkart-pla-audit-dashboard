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

/* ================= HEADER & PERIOD ================= */
function extractReportPeriod(rows) {
  let start = "";
  let end = "";

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
      reportPeriod.innerHTML = `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow = autoDetectHeader(rows, ["Campaign Name", "Ad Spend"]);
    const headers = rows[hRow];
    const data = rows.slice(hRow + 1);
    const h = n => headers.indexOf(n);

    let S=0,R=0,U=0,map={};

    data.forEach(x=>{
      const c=x[h("Campaign Name")];
      if(!c) return;
      const s=+x[h("Ad Spend")]||0;
      const r=+x[h("Total Revenue (Rs.)")]||0;
      const u=+x[h("Total converted units")]||0;
      S+=s;R+=r;U+=u;
      if(!map[c]) map[c]={s:0,r:0,u:0};
      map[c].s+=s;map[c].r+=r;map[c].u+=u;
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
  };
  r.readAsText(f);
}

/* ================= PLACEMENT REPORT ================= */
function generatePlacement() {
  const f = placementFile.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = () => {
    const rows = parseCSV(r.result);
    const period = extractReportPeriod(rows);

    if (period.start || period.end) {
      reportPeriodPlacement.innerHTML =
        `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow = autoDetectHeader(rows, ["Placement Type", "Campaign Name"]);
    const headers = rows[hRow];
    const data = rows.slice(hRow + 1);
    const h = n => headers.indexOf(n);

    const overall={}, pivot={};

    data.forEach(x=>{
      const c=x[h("Campaign Name")], id=x[h("Campaign ID")], p=x[h("Placement Type")];
      if(!c||!p) return;
      const s=+x[h("Ad Spend")]||0;
      const u=(+x[h("Direct Units Sold")]||0)+(+x[h("Indirect Units Sold")]||0);
      const r=+x[h("Direct Revenue")]||0 + +x[h("Indirect Revenue")]||0;

      if(!overall[p]) overall[p]={s:0,r:0,u:0};
      overall[p].s+=s;overall[p].r+=r;overall[p].u+=u;

      if(!pivot[c]) pivot[c]={__id:id};
      if(!pivot[c][p]) pivot[c][p]={s:0,r:0,u:0};
      pivot[c][p].s+=s;pivot[c][p].r+=r;pivot[c][p].u+=u;
    });

    placementOverallTable.querySelector("tbody").innerHTML =
      Object.entries(overall).map(([p,c])=>{
        const roi=c.r/c.s;
        return `<tr class="${roiClass(roi)}">
          <td>${p}</td><td>${c.s.toFixed(0)}</td><td>${c.r.toFixed(0)}</td>
          <td>${c.u}</td><td>${roi.toFixed(2)}</td></tr>`;
      }).join("");

    const tb=placementCampaignTable.querySelector("tbody");
    tb.innerHTML="";
    Object.keys(pivot).forEach((c,i)=>{
      const g=`grp-${i}`;
      const e=Object.entries(pivot[c]).filter(x=>x[0]!=="__id");
      const sum=e.reduce((a,[,v])=>{a.s+=v.s;a.r+=v.r;a.u+=v.u;return a;},{s:0,r:0,u:0});

      tb.innerHTML+=`
        <tr class="campaign-group" data-group="${g}">
          <td><span class="campaign-toggle">▶</span>${c} (${pivot[c].__id})</td>
          <td></td><td>${sum.s.toFixed(0)}</td>
          <td>${sum.r.toFixed(0)}</td><td>${sum.u}</td>
          <td>${(sum.r/sum.s).toFixed(2)}</td>
        </tr>`;

      e.forEach(([p,v])=>{
        const roi=v.r/v.s;
        tb.innerHTML+=`
          <tr class="hidden-row ${roiClass(roi)}" data-parent="${g}">
            <td></td><td>${p}</td>
            <td>${v.s.toFixed(0)}</td><td>${v.r.toFixed(0)}</td>
            <td>${v.u}</td><td>${roi.toFixed(2)}</td>
          </tr>`;
      });
    });

    document.querySelectorAll(".campaign-group").forEach(r=>{
      r.onclick=()=>{
        const g=r.dataset.group;
        const rows=document.querySelectorAll(`[data-parent="${g}"]`);
        const icon=r.querySelector(".campaign-toggle");
        const collapsed=rows[0].classList.contains("hidden-row");
        rows.forEach(x=>x.classList.toggle("hidden-row",!collapsed));
        icon.textContent=collapsed?"▼":"▶";
      };
    });
  };
  r.readAsText(f);
}

function expandAllCampaigns(){
  document.querySelectorAll("[data-parent]").forEach(r=>r.classList.remove("hidden-row"));
}

function collapseAllCampaigns(){
  document.querySelectorAll("[data-parent]").forEach(r=>r.classList.add("hidden-row"));
}
